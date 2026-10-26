-- =====================================================================
-- Design Book · RLS + workflow tests
-- Runs as ONE DO block; everything is rolled back at the end by raising
-- an exception whose message is the test report (scripts/db-test.mjs).
-- Every line of the report starts with "ok" or "FAIL".
-- =====================================================================

create or replace function pg_temp.as_user(p_uid uuid) returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create or replace function pg_temp.as_admin() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end $$;

-- Expect the SQL to raise. Returns 'ok …' or 'FAIL …'.
create or replace function pg_temp.must_fail(p_label text, p_sql text) returns text language plpgsql as $$
begin
  execute p_sql;
  return 'FAIL  ' || p_label || ' — expected an error but it succeeded';
exception when others then
  return 'ok    ' || p_label || ' — ' || sqlerrm;
end $$;

create or replace function pg_temp.must_pass(p_label text, p_sql text) returns text language plpgsql as $$
begin
  execute p_sql;
  return 'ok    ' || p_label;
exception when others then
  return 'FAIL  ' || p_label || ' — ' || sqlerrm;
end $$;

create or replace function pg_temp.check(p_label text, p_cond boolean) returns text language sql as $$
  select case when coalesce(p_cond, false) then 'ok    ' else 'FAIL  ' end || p_label;
$$;

do $test$
declare
  r text := '';
  o_ho uuid; o_a uuid; o_b uuid; o_c uuid; cat uuid;
  u_admin uuid := gen_random_uuid(); u_ho uuid := gen_random_uuid();
  u_a uuid := gen_random_uuid(); u_b uuid := gen_random_uuid(); u_c uuid := gen_random_uuid();
  d1 uuid := gen_random_uuid(); d2 uuid := gen_random_uuid(); d3 uuid := gen_random_uuid();
  t1 uuid; t2 uuid; t3 uuid;
  v_since timestamptz; v_int int; v_txt text; v_status text; v_outlet uuid;
begin
  -- ---------- fixtures (as postgres) ----------
  select id into o_ho from public.outlets where code = 'HO';
  select id into o_a from public.outlets where code = 'OUT1';
  select id into o_b from public.outlets where code = 'OUT2';
  select id into o_c from public.outlets where code = 'OUT3';
  select id into cat from public.categories order by sort_order limit 1;

  insert into auth.users (id, instance_id, aud, role, email)
  select x, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', x::text || '@test.local'
  from unnest(array[u_admin, u_ho, u_a, u_b, u_c]) x;

  insert into public.profiles (id, username, full_name, email, phone, role, outlet_id, must_change_password) values
    (u_admin, 't_admin', 'Test Admin', u_admin || '@test.local', '9000000001', 'super_admin', o_ho, false),
    (u_ho,    't_ho',    'Test HO',    u_ho    || '@test.local', '9000000002', 'head_office', o_ho, false),
    (u_a,     't_shop_a','Shop A',     u_a     || '@test.local', '9000000003', 'shop_user',   o_a,  false),
    (u_b,     't_shop_b','Shop B',     u_b     || '@test.local', '9000000004', 'shop_user',   o_b,  false),
    (u_c,     't_shop_c','Shop C',     u_c     || '@test.local', '9000000005', 'shop_user',   o_c,  false);

  insert into public.designs (id, sku, barcode, category_id, mrp, origin_outlet_id, current_outlet_id, location_since, created_by) values
    (d1, 'T-SKU-1', 'T-BC-1', cat, 10000, o_a, o_a, now() - interval '40 days', u_a),
    (d2, 'T-SKU-2', 'T-BC-2', cat, 20000, o_a, o_a, now() - interval '75 days', u_a),
    (d3, 'T-SKU-3', 'T-BC-3', cat, 30000, o_b, o_b, now() - interval '5 days',  u_b);
  insert into public.design_locations (design_id, outlet_id, arrived_at)
    values (d1, o_a, now() - interval '40 days'), (d2, o_a, now() - interval '75 days'), (d3, o_b, now() - interval '5 days');

  -- fake uploaded documents (only presence is checked)
  insert into storage.objects (bucket_id, name, owner) values
    ('documents', 'holds/' || d2 || '/doc.pdf', u_a),
    ('documents', 'holds/' || d2 || '/doc2.pdf', u_a),
    ('documents', 'invoices/' || d1 || '/inv.pdf', u_a);

  -- ================= RLS: direct table access =================
  perform pg_temp.as_user(u_a);
  update public.designs set mrp = 1 where id = d3;
  get diagnostics v_int = row_count;
  r := r || E'\n' || pg_temp.check('shop cannot UPDATE another outlet''s design directly (0 rows)', v_int = 0);
  update public.designs set mrp = 1 where id = d1;
  get diagnostics v_int = row_count;
  r := r || E'\n' || pg_temp.check('shop cannot UPDATE even its own design directly (RPC only)', v_int = 0);
  delete from public.designs where id = d1;
  get diagnostics v_int = row_count;
  r := r || E'\n' || pg_temp.check('shop cannot DELETE a design', v_int = 0);
  r := r || E'\n' || pg_temp.must_fail('shop cannot INSERT a design directly',
    format('insert into public.designs (sku, barcode, category_id, mrp, origin_outlet_id, current_outlet_id, created_by) values (''X'',''X'',%L,1,%L,%L,%L)', cat, o_a, o_a, u_a));
  r := r || E'\n' || pg_temp.must_fail('shop cannot INSERT notifications directly',
    format('insert into public.notifications (user_id, kind, title) values (%L, ''x'', ''x'')', u_b));
  r := r || E'\n' || pg_temp.must_fail('shop cannot INSERT design_events directly',
    format('insert into public.design_events (design_id, event) values (%L, ''x'')', d1));
  select count(*) into v_int from public.profiles;
  r := r || E'\n' || pg_temp.check('shop sees only its own profile row', v_int = 1);
  r := r || E'\n' || pg_temp.must_fail('shop cannot call internal helper _fail', 'select public._fail(''x'')');
  r := r || E'\n' || pg_temp.must_fail('shop cannot call release_expired_holds', 'select public.release_expired_holds()');

  -- ================= edit / delete permissions =================
  r := r || E'\n' || pg_temp.must_fail('shop cannot edit another outlet''s design (RPC)',
    format('select public.update_design(%L, ''{"mrp": 5}'')', d3));
  r := r || E'\n' || pg_temp.must_pass('shop can edit own design (RPC)',
    format('select public.update_design(%L, ''{"title": "Edited"}'')', d1));
  r := r || E'\n' || pg_temp.must_fail('shop cannot soft delete', format('select public.soft_delete_design(%L, ''some reason'')', d1));
  r := r || E'\n' || pg_temp.must_fail('shop cannot request its own outlet''s design', format('select public.request_transfer(%L)', d1));

  -- ================= holds =================
  r := r || E'\n' || pg_temp.must_fail('hold without document fails',
    format('select public.place_hold(%L, 5, ''Customer reserve'', ''holds/%s/missing.pdf'')', d2, d2));
  r := r || E'\n' || pg_temp.must_fail('hold with 31 days fails',
    format('select public.place_hold(%L, 31, ''Customer reserve'', ''holds/%s/doc.pdf'')', d2, d2));
  r := r || E'\n' || pg_temp.must_fail('hold with short reason fails',
    format('select public.place_hold(%L, 5, ''abc'', ''holds/%s/doc.pdf'')', d2, d2));
  r := r || E'\n' || pg_temp.must_pass('owner places hold',
    format('select public.place_hold(%L, 5, ''Customer reserve'', ''holds/%s/doc.pdf'')', d2, d2));
  perform pg_temp.as_user(u_b);
  r := r || E'\n' || pg_temp.must_fail('requesting a HELD design fails', format('select public.request_transfer(%L)', d2));
  perform pg_temp.as_user(u_a);
  r := r || E'\n' || pg_temp.must_pass('owner releases hold', format('select public.release_hold(%L, ''done'')', d2));
  r := r || E'\n' || pg_temp.must_pass('owner holds again',
    format('select public.place_hold(%L, 3, ''Second reserve'', ''holds/%s/doc2.pdf'')', d2, d2));
  select hold_no into v_int from public.holds where design_id = d2 and released_at is null;
  r := r || E'\n' || pg_temp.check('hold numbers count up (#2)', v_int = 2);

  -- expiry via cron function
  perform pg_temp.as_admin();
  update public.holds set expires_at = now() - interval '1 minute' where design_id = d2 and released_at is null;
  perform public.release_expired_holds();
  select status into v_status from public.designs where id = d2;
  r := r || E'\n' || pg_temp.check('expired hold auto-released → available', v_status = 'available');

  -- ================= sold =================
  perform pg_temp.as_user(u_a);
  r := r || E'\n' || pg_temp.must_fail('mark sold without invoice number fails',
    format('select public.mark_sold(%L, '''', ''invoices/%s/inv.pdf'')', d1, d1));
  r := r || E'\n' || pg_temp.must_fail('mark sold without invoice file fails',
    format('select public.mark_sold(%L, ''INV-1'', ''invoices/%s/none.pdf'')', d1, d1));
  r := r || E'\n' || pg_temp.must_pass('mark sold with invoice',
    format('select public.mark_sold(%L, ''INV-1'', ''invoices/%s/inv.pdf'', 9500)', d1, d1));
  perform pg_temp.as_user(u_b);
  r := r || E'\n' || pg_temp.must_fail('requesting a SOLD design fails', format('select public.request_transfer(%L)', d1));
  perform pg_temp.as_user(u_a);
  r := r || E'\n' || pg_temp.must_pass('unmark sold', format('select public.unmark_sold(%L)', d1));

  -- ================= transfer: forward to requester =================
  perform pg_temp.as_user(u_b);
  t1 := public.request_transfer(d1, 'For a customer');
  r := r || E'\n' || pg_temp.check('B requests design from A', t1 is not null);
  perform pg_temp.as_user(u_c);
  r := r || E'\n' || pg_temp.must_fail('second request on a REQUESTED design fails', format('select public.request_transfer(%L)', d1));
  perform pg_temp.as_user(u_c);
  r := r || E'\n' || pg_temp.must_fail('another outlet cannot cancel B''s request', format('select public.cancel_request(%L)', t1));
  perform pg_temp.as_user(u_b);
  r := r || E'\n' || pg_temp.must_fail('requester cannot decide own request', format('select public.decide_transfer(%L, true)', t1));
  perform pg_temp.as_user(u_a);
  r := r || E'\n' || pg_temp.must_fail('reject without reason/document fails', format('select public.decide_transfer(%L, false)', t1));
  r := r || E'\n' || pg_temp.must_fail('reject with reason but no document fails',
    format('select public.decide_transfer(%L, false, ''Reserved for VIP'', null, 5)', t1));
  r := r || E'\n' || pg_temp.must_fail('send to HO before accept fails', format('select public.send_to_ho(%L)', t1));
  r := r || E'\n' || pg_temp.must_pass('owner accepts', format('select public.decide_transfer(%L, true)', t1));
  r := r || E'\n' || pg_temp.must_fail('edit while in transfer fails', format('select public.update_design(%L, ''{"title":"x"}'')', d1));
  perform pg_temp.as_user(u_c);
  r := r || E'\n' || pg_temp.must_fail('requesting an IN-TRANSFER design fails', format('select public.request_transfer(%L)', d1));
  perform pg_temp.as_user(u_b);
  r := r || E'\n' || pg_temp.must_fail('requester cannot send to HO', format('select public.send_to_ho(%L)', t1));
  perform pg_temp.as_user(u_a);
  r := r || E'\n' || pg_temp.must_pass('owner sends to HO', format('select public.send_to_ho(%L)', t1));
  r := r || E'\n' || pg_temp.must_fail('shop cannot mark received at HO', format('select public.ho_receive(%L)', t1));
  r := r || E'\n' || pg_temp.must_fail('receive before HO dispatch fails', format('select public.receive_transfer(%L)', t1));
  perform pg_temp.as_user(u_ho);
  r := r || E'\n' || pg_temp.must_pass('HO receives', format('select public.ho_receive(%L)', t1));
  select current_outlet_id into v_outlet from public.designs where id = d1;
  r := r || E'\n' || pg_temp.check('design is at HO after ho_receive', v_outlet = o_ho);
  r := r || E'\n' || pg_temp.must_fail('HO dispatch with bad target fails', format('select public.ho_dispatch(%L, ''moon'')', t1));
  r := r || E'\n' || pg_temp.must_pass('HO forwards to requester', format('select public.ho_dispatch(%L, ''requester'', ''ok'')', t1));
  perform pg_temp.as_user(u_a);
  r := r || E'\n' || pg_temp.must_fail('origin cannot receive a forwarded design', format('select public.receive_transfer(%L)', t1));
  perform pg_temp.as_user(u_b);
  r := r || E'\n' || pg_temp.must_pass('requester receives', format('select public.receive_transfer(%L)', t1));
  perform pg_temp.as_admin();
  select current_outlet_id, location_since, status into v_outlet, v_since, v_status from public.designs where id = d1;
  r := r || E'\n' || pg_temp.check('completed: design now at B, available', v_outlet = o_b and v_status = 'available');
  r := r || E'\n' || pg_temp.check('completed: age reset to 0', v_since > now() - interval '1 minute');
  select count(*) into v_int from public.design_locations where design_id = d1 and left_at is null;
  r := r || E'\n' || pg_temp.check('exactly one open location row', v_int = 1);

  -- ================= transfer: return to origin keeps age =================
  perform pg_temp.as_user(u_b);
  t2 := public.request_transfer(d2);
  perform pg_temp.as_user(u_a);
  perform public.decide_transfer(t2, true);
  perform public.send_to_ho(t2);
  perform pg_temp.as_user(u_ho);
  perform public.ho_receive(t2);
  perform public.ho_dispatch(t2, 'origin', 'Wrong piece');
  perform pg_temp.as_user(u_b);
  r := r || E'\n' || pg_temp.must_fail('requester cannot receive a return-to-origin', format('select public.receive_transfer(%L)', t2));
  perform pg_temp.as_user(u_a);
  r := r || E'\n' || pg_temp.must_pass('origin receives return', format('select public.receive_transfer(%L)', t2));
  perform pg_temp.as_admin();
  select current_outlet_id, location_since into v_outlet, v_since from public.designs where id = d2;
  r := r || E'\n' || pg_temp.check('returned: back at A, age continues (~75 d)',
    v_outlet = o_a and v_since < now() - interval '74 days');
  select status::text into v_txt from public.transfers where id = t2;
  r := r || E'\n' || pg_temp.check('transfer status = returned', v_txt = 'returned');

  -- ================= rejection places a numbered hold =================
  perform pg_temp.as_user(u_c);
  t3 := public.request_transfer(d2);
  perform pg_temp.as_admin();
  insert into storage.objects (bucket_id, name, owner) values ('documents', 'rejections/' || t3 || '/r.pdf', u_a);
  perform pg_temp.as_user(u_a);
  r := r || E'\n' || pg_temp.must_fail('reject with 0 hold days fails',
    format('select public.decide_transfer(%L, false, ''Reserved for VIP'', ''rejections/%s/r.pdf'', 0)', t3, t3));
  r := r || E'\n' || pg_temp.must_pass('reject with reason + document + days',
    format('select public.decide_transfer(%L, false, ''Reserved for VIP'', ''rejections/%s/r.pdf'', 7)', t3, t3));
  perform pg_temp.as_admin();
  select d.status::text, h.hold_no, h.source into v_status, v_int, v_txt
    from public.designs d join public.holds h on h.design_id = d.id and h.released_at is null where d.id = d2;
  r := r || E'\n' || pg_temp.check('rejection → on_hold with hold #3 (source rejection)',
    v_status = 'on_hold' and v_int = 3 and v_txt = 'rejection');

  -- ================= image votes =================
  perform pg_temp.as_user(u_b);
  r := r || E'\n' || pg_temp.must_fail('shop cannot vote on own outlet''s images', format('select public.vote_image_unclear(%L)', d3));
  perform pg_temp.as_user(u_a);
  r := r || E'\n' || pg_temp.must_pass('other outlet votes unclear',
    format('select public.vote_image_unclear(%L, array[''front'']::public.media_kind[], ''blurry'')', d3));
  r := r || E'\n' || pg_temp.must_fail('duplicate open vote fails', format('select public.vote_image_unclear(%L)', d3));
  perform pg_temp.as_admin();
  select unclear_votes into v_int from public.designs where id = d3;
  r := r || E'\n' || pg_temp.check('unclear_votes = 1', v_int = 1);
  select count(*) into v_int from public.notifications where user_id = u_b and kind = 'image_vote';
  r := r || E'\n' || pg_temp.check('owner outlet notified of vote', v_int = 1);
  perform pg_temp.as_user(u_b);
  r := r || E'\n' || pg_temp.must_fail('resolve votes without replacing an image fails', format('select public.resolve_image_votes(%L)', d3));
  perform pg_temp.as_user(u_a);
  r := r || E'\n' || pg_temp.must_pass('voter withdraws vote', format('select public.withdraw_vote(%L)', d3));

  -- ================= HO tools =================
  perform pg_temp.as_user(u_a);
  r := r || E'\n' || pg_temp.must_fail('shop cannot relocate', format('select public.ho_relocate(%L, %L, ''moving stock'')', d3, o_a));
  r := r || E'\n' || pg_temp.must_fail('shop cannot request image correction',
    format('select public.request_image_correction(%L, array[''front'']::public.media_kind[], ''fix'')', d3));
  perform pg_temp.as_user(u_ho);
  r := r || E'\n' || pg_temp.must_fail('relocate without reason fails', format('select public.ho_relocate(%L, %L, '''')', d3, o_c));
  r := r || E'\n' || pg_temp.must_pass('HO relocates with reason', format('select public.ho_relocate(%L, %L, ''Rebalancing stock'')', d3, o_c));
  r := r || E'\n' || pg_temp.must_pass('HO requests image correction',
    format('select public.request_image_correction(%L, array[''front'']::public.media_kind[], ''Too dark'')', d3));
  r := r || E'\n' || pg_temp.must_fail('soft delete without reason fails', format('select public.soft_delete_design(%L, '''')', d3));
  r := r || E'\n' || pg_temp.must_pass('HO soft deletes with reason', format('select public.soft_delete_design(%L, ''Duplicate entry'')', d3));
  perform pg_temp.as_user(u_a);
  select count(*) into v_int from public.designs where id = d3;
  r := r || E'\n' || pg_temp.check('deleted design hidden from shops', v_int = 0);
  perform pg_temp.as_user(u_ho);
  r := r || E'\n' || pg_temp.must_fail('HO cannot restore (admin only)', format('select public.restore_design(%L)', d3));
  perform pg_temp.as_user(u_admin);
  r := r || E'\n' || pg_temp.must_pass('admin restores', format('select public.restore_design(%L)', d3));

  -- ================= audit =================
  perform pg_temp.as_admin();
  select count(*) into v_int from public.design_events where design_id in (d1, d2, d3);
  r := r || E'\n' || pg_temp.check(format('design_events written for every mutation (%s rows)', v_int), v_int >= 25);

  raise exception 'TEST_REPORT%', r;
end
$test$;

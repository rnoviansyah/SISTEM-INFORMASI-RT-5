--

CREATE FUNCTION public.trg_users_hash_password() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public', 'pg_temp'
    AS $_$
begin
  if new.password is not null and new.password <> '' and new.password not like '$2%' then
    new.password := public._bcrypt_hash(new.password);
  end if;
  return new;
end $_$;


ALTER FUNCTION public.trg_users_hash_password() OWNER TO postgres;

--
-- Name: truncate_table_secured(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.truncate_table_secured(p_table_name text, p_token text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
    DECLARE
      v_role text;
        v_lower text;
        BEGIN
          -- Cek Role di Sessions
            SELECT role INTO v_role FROM public."Sessions" WHERE token = p_token OR nik = p_token LIMIT 1;
              
                -- Fallback Cek Role di Users
                  IF v_role IS NULL THEN
                      SELECT role INTO v_role FROM public."Users" WHERE username = p_token OR nik = p_token LIMIT 1;
                        END IF;

                          v_lower := LOWER(TRIM(p_table_name));

                            -- PROTEKSI KETAT: Dilarang hapus Warga, Users, Sessions, Pengaturan
                              IF v_lower LIKE '%warga%' OR v_lower LIKE '%user%' OR v_lower LIKE '%session%' OR v_lower LIKE '%pengaturan%' THEN
                                  RETURN jsonb_build_object('status', 'error', 'message', 'SECURITY ALERT: Tabel vital dilindungi dan tidak boleh dihapus!');
                                    END IF;

                                      -- EKSEKUSI HAPUS ISI TABEL TRANSAKSI (Gunakan WHERE true agar Lolos dari Klausa Postgres)
                                        IF v_lower LIKE '%iuran%' THEN 
                                            DELETE FROM public."Iuran" WHERE true;
                                              ELSIF v_lower LIKE '%keuangan%' OR v_lower LIKE '%kas%' THEN 
                                                  DELETE FROM public."Keuangan" WHERE true;
                                                    ELSIF v_lower LIKE '%aduan%' OR v_lower LIKE '%pengaduan%' THEN 
                                                        DELETE FROM public."Pengaduan" WHERE true;
                                                          ELSIF v_lower LIKE '%surat%' THEN 
                                                              DELETE FROM public."SuratPengantar" WHERE true;
                                                                ELSIF v_lower LIKE '%sumbangan%' THEN 
                                                                    DELETE FROM public."Sumbangan" WHERE true;
                                                                      ELSIF v_lower LIKE '%aset%' THEN 
                                                                          DELETE FROM public."Aset" WHERE true;
                                                                            ELSIF v_lower LIKE '%peminjaman%' OR v_lower LIKE '%pinjam%' THEN 
                                                                                DELETE FROM public."Peminjaman" WHERE true;
                                                                                  ELSIF v_lower LIKE '%aspirasi%' THEN 
                                                                                      DELETE FROM public."Aspirasi" WHERE true;
                                                                                        ELSE
                                                                                            RETURN jsonb_build_object('status', 'error', 'message', 'Tabel ' || p_table_name || ' tidak ditemukan.');
                                                                                              END IF;

                                                                                                RETURN jsonb_build_object('status', 'success', 'message', 'Tabel ' || p_table_name || ' berhasil dibersihkan!');
                                                                                                END;
                                                                                                $$;


ALTER FUNCTION public.truncate_table_secured(p_table_name text, p_token text) OWNER TO postgres;

--
-- Name: update_user_secured(text, text, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_user_secured(p_token text, p_old_username text, p_data jsonb) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        DECLARE
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            v_role text := 'Warga';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            BEGIN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                SELECT s.role INTO v_role FROM public."Sessions" s WHERE TRIM(s.token) = TRIM(p_token) LIMIT 1;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        IF UPPER(COALESCE(v_role, '')) != 'RT' THEN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                RETURN json_build_object('status', 'error', 'message', 'Akses ditolak! Hanya RT yang diizinkan mengedit user.');
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    END IF;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        IF p_data->>'password' IS NOT NULL AND TRIM(p_data->>'password') != '' THEN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                UPDATE public."Users"
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        SET 
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    username = COALESCE(p_data->>'username', username),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                nik      = COALESCE(p_data->>'nik', nik),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            role     = COALESCE(p_data->>'role', role),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        password = p_data->>'password'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                WHERE LOWER(username) = LOWER(p_old_username);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    ELSE
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            UPDATE public."Users"
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    SET 
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                username = COALESCE(p_data->>'username', username),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            nik      = COALESCE(p_data->>'nik', nik),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        role     = COALESCE(p_data->>'role', role)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                WHERE LOWER(username) = LOWER(p_old_username);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    END IF;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        RETURN json_build_object('status', 'success', 'message', 'Akun User berhasil diperbarui!');
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        EXCEPTION WHEN OTHERS THEN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            RETURN json_build_object('status', 'error', 'message', SQLERRM);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            $$;


ALTER FUNCTION public.update_user_secured(p_token text, p_old_username text, p_data jsonb) OWNER TO postgres;

--
-- Name: update_warga_secured(text, text, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_warga_secured(p_token text, p_id text, p_data jsonb) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
                                                                                                                                                                                        DECLARE
                                                                                                                                                                                            v_role text := 'Warga';
                                                                                                                                                                                            BEGIN
                                                                                                                                                                                                SELECT s.role INTO v_role FROM public."Sessions" s WHERE TRIM(s.token) = TRIM(p_token) LIMIT 1;
                                                                                                                                                                                                    
                                                                                                                                                                                                        IF UPPER(COALESCE(v_role, '')) != 'RT' THEN
                                                                                                                                                                                                                RETURN json_build_object('status', 'error', 'message', 'Akses ditolak! Hanya RT yang diizinkan mengubah data warga.');
                                                                                                                                                                                                                    END IF;

                                                                                                                                                                                                                        UPDATE public."Warga"
                                                                                                                                                                                                                            SET 
                                                                                                                                                                                                                                    nama_lengkap   = COALESCE(p_data->>'nama_lengkap', nama_lengkap),
                                                                                                                                                                                                                                            nama_panggilan = COALESCE(p_data->>'nama_panggilan', nama_panggilan),
                                                                                                                                                                                                                                                    nik            = COALESCE(p_data->>'nik', nik),
                                                                                                                                                                                                                                                            no_kk          = COALESCE(p_data->>'no_kk', no_kk),
                                                                                                                                                                                                                                                                    tempat_lahir   = COALESCE(p_data->>'tempat_lahir', tempat_lahir),
                                                                                                                                                                                                                                                                            tanggal_lahir  = COALESCE(p_data->>'tanggal_lahir', tanggal_lahir),
                                                                                                                                                                                                                                                                                    jenis_kelamin  = COALESCE(p_data->>'jenis_kelamin', jenis_kelamin),
                                                                                                                                                                                                                                                                                            alamat         = COALESCE(p_data->>'alamat', alamat),
                                                                                                                                                                                                                                                                                                    status_nikah   = COALESCE(p_data->>'status_nikah', status_nikah),
                                                                                                                                                                                                                                                                                                            status_tinggal = COALESCE(p_data->>'status_tinggal', status_tinggal),
                                                                                                                                                                                                                                                                                                                    pekerjaan      = COALESCE(p_data->>'pekerjaan', pekerjaan),
                                                                                                                                                                                                                                                                                                                            no_hp          = COALESCE(p_data->>'no_hp', no_hp),
                                                                                                                                                                                                                                                                                                                                    foto_url       = COALESCE(p_data->>'foto_url', foto_url)
                                                                                                                                                                                                                                                                                                                                        WHERE id = p_id OR nik = p_id;

                                                                                                                                                                                                                                                                                                                                            RETURN json_build_object('status', 'success', 'message', 'Data Warga berhasil diperbarui!');
                                                                                                                                                                                                                                                                                                                                            EXCEPTION WHEN OTHERS THEN
                                                                                                                                                                                                                                                                                                                                                RETURN json_build_object('status', 'error', 'message', SQLERRM);
                                                                                                                                                                                                                                                                                                                                                END;
                                                                                                                                                                                                                                                                                                                                                $$;


ALTER FUNCTION public.update_warga_secured(p_token text, p_id text, p_data jsonb) OWNER TO postgres;

--
-- Name: upload_file_secured(text, text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.upload_file_secured(p_token text, p_path text, p_base64 text, p_content_type text DEFAULT 'image/jpeg'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_role text := public.auth_role(p_token);
  v_b64  text := trim(coalesce(p_base64,''));
  v_path text := lower(trim(coalesce(p_path,'')));
begin
  if v_role is null then
    return jsonb_build_object('status','error','message','Sesi tidak valid. Silakan login ulang.');
  end if;
  -- Terima "data:image/...;base64,...." atau base64 polos
  if v_b64 like 'data:%' then
    v_b64 := split_part(v_b64, ',', 2);
  end if;
  if v_b64 = '' or octet_length(v_b64) > 4000000 then
    return jsonb_build_object('status','error','message','File kosong atau terlalu besar (maks ±3 MB).');
  end if;
  if not public._is_image_base64(v_b64) then
    return jsonb_build_object('status','error','message','File bukan gambar asli (JPEG/PNG/WebP/GIF/BMP).');
  end if;
  -- Path aman: hanya huruf/angka/_/-// (cegah path traversal)
  if v_path = '' or v_path ~ '[^a-z0-9_\-/]' or v_path like '../%' or v_path like '%..' or strpos(v_path, '..') > 0 then
    return jsonb_build_object('status','error','message','Path file tidak valid.');
  end if;
  return jsonb_build_object('status','success','message','File valid & terverifikasi.');
end $$;


ALTER FUNCTION public.upload_file_secured(p_token text, p_path text, p_base64 text, p_content_type text) OWNER TO postgres;

--
-- Name: verify_user_login(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.verify_user_login(p_username text, p_password text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_user public."Users"%rowtype;
  v_u text := lower(trim(coalesce(p_username,'')));
  v_p text := coalesce(p_password,'');
  v_lock text;
begin
  if v_u = '' or v_p = '' then
    return jsonb_build_object('status','error','message','Username / NIK dan Password tidak boleh kosong!');
  end if;
  v_lock := public._login_lock_check(v_u);
  if v_lock is not null then
    return jsonb_build_object('status','error','message', v_lock);
  end if;
  select * into v_user from public."Users"
    where lower(trim(coalesce(username,''))) = v_u
       or nik_sha = public._sha(v_u)
       or public._sha(coalesce(nik,'')) = public._sha(v_u)
    limit 1;
  if not found then
    perform public._login_lock_fail(v_u);
    return jsonb_build_object('status','error','message','Akun tidak ditemukan.');
  end if;
  if not public._bcrypt_check(v_p, v_user.password) then
    perform public._login_lock_fail(v_u);
    return jsonb_build_object('status','error','message','Password salah.');
  end if;
  perform public._login_lock_clear(v_u);
  return jsonb_build_object(
    'status','success',
    'username', v_user.username,
    'role', v_user.role,
    'nik', public._dec_data(v_user.nik),
    'nama', v_user.nama
  );
end $$;


ALTER FUNCTION public.verify_user_login(p_username text, p_password text) OWNER TO postgres;

--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
    -- Regclass of the table e.g. public.notes
    entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

    -- I, U, D, T: insert, update ...
    action realtime.action = (
        case wal ->> 'action'
            when 'I' then 'INSERT'
            when 'U' then 'UPDATE'
            when 'D' then 'DELETE'
            else 'ERROR'
        end
    );

    -- Is row level security enabled for the table
    is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

    subscriptions realtime.subscription[] = array_agg(subs)
        from
            realtime.subscription subs
        where
            subs.entity = entity_
            -- Filter by action early - only get subscriptions interested in this action
            -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'
            and (subs.action_filter = '*' or subs.action_filter = action::text);

    -- Subscription vars
    working_role regrole;
    working_selected_columns text[];
    claimed_role regrole;
    claims jsonb;

    subscription_id uuid;
    subscription_has_access bool;
    visible_to_subscription_ids uuid[] = '{}';

    -- structured info for wal's columns
    columns realtime.wal_column[];
    -- previous identity values for update/delete
    old_columns realtime.wal_column[];

    error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

    -- Primary jsonb output for record
    output jsonb;

    -- Loop record for iterating unique roles (outer loop)
    role_record record;
    -- Loop record for iterating unique selected_columns within a role (inner loop)
    cols_record record;
    -- Subscription ids visible at the role level (before fanning out by selected_columns)
    visible_role_sub_ids uuid[] = '{}';

begin
    perform set_config('role', null, true);

    columns =
        array_agg(
            (
                x->>'name',
                x->>'type',
                x->>'typeoid',
                realtime.cast(
                    (x->'value') #>> '{}',
                    coalesce(
                        (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                        (x->>'type')::regtype
                    )
                ),
                (pks ->> 'name') is not null,
                true
            )::realtime.wal_column
        )
        from
            jsonb_array_elements(wal -> 'columns') x
            left join jsonb_array_elements(wal -> 'pk') pks
                on (x ->> 'name') = (pks ->> 'name');

    old_columns =
        array_agg(
            (
                x->>'name',
                x->>'type',
                x->>'typeoid',
                realtime.cast(
                    (x->'value') #>> '{}',
                    coalesce(
                        (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                        (x->>'type')::regtype
                    )
                ),
                (pks ->> 'name') is not null,
                true
            )::realtime.wal_column
        )
        from
            jsonb_array_elements(wal -> 'identity') x
            left join jsonb_array_elements(wal -> 'pk') pks
                on (x ->> 'name') = (pks ->> 'name');

    for role_record in
        select claims_role
        from (select distinct claims_role from unnest(subscriptions)) t
        order by claims_role::text
    loop
        working_role := role_record.claims_role;

        -- Update `is_selectable` for columns and old_columns (once per role)
        columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(columns) c;

        old_columns =
                array_agg(
                    (
                        c.name,
                        c.type_name,
                        c.type_oid,
                        c.value,
                        c.is_pkey,
                        pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                    )::realtime.wal_column
                )
                from
                    unnest(old_columns) c;

        if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
            -- Fan out 400 error per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;
                return next (
                    jsonb_build_object(
                        'schema', wal ->> 'schema',
                        'table', wal ->> 'table',
                        'type', action
                    ),
                    is_rls_enabled,
                    (select array_agg(s.subscription_id) from unnest(subscriptions) as s where s.claims_role = working_role and (s.selected_columns is not distinct from working_selected_columns)),
                    array['Error 400: Bad Request, no primary key']
                )::realtime.wal_rls;
            end loop;

        -- The claims role does not have SELECT permission to the primary key of entity
        elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
            -- Fan out 401 error per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;
                return next (
                    jsonb_build_object(
                        'schema', wal ->> 'schema',
                        'table', wal ->> 'table',
                        'type', action
                    ),
                    is_rls_enabled,
                    (select array_agg(s.subscription_id) from unnest(subscriptions) as s where s.claims_role = working_role and (s.selected_columns is not distinct from working_selected_columns)),
                    array['Error 401: Unauthorized']
                )::realtime.wal_rls;
            end loop;

        else
            -- Create the prepared statement (once per role)
            if is_rls_enabled and action <> 'DELETE' then
                if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                    deallocate walrus_rls_stmt;
                end if;
                execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
            end if;

            -- Collect all visible subscription IDs for this role (filter check + RLS check)
            visible_role_sub_ids = '{}';

            for subscription_id, claims in (
                    select
                        subs.subscription_id,
                        subs.claims
                    from
                        unnest(subscriptions) subs
                    where
                        subs.entity = entity_
                        and subs.claims_role = working_role
                        and (
                            realtime.is_visible_through_filters(columns, subs.filters)
                            or (
                              action = 'DELETE'
                              and realtime.is_visible_through_filters(old_columns, subs.filters)
                            )
                        )
            ) loop

                if not is_rls_enabled or action = 'DELETE' then
                    visible_role_sub_ids = visible_role_sub_ids || subscription_id;
                else
                    -- Check if RLS allows the role to see the record
                    perform
                        -- Trim leading and trailing quotes from working_role because set_config
                        -- doesn't recognize the role as valid if they are included
                        set_config('role', trim(both '"' from working_role::text), true),
                        set_config('request.jwt.claims', claims::text, true);

                    execute 'execute walrus_rls_stmt' into subscription_has_access;

                    -- Reset the role on every FOR..LOOP batch execution.
                    -- The first batch of 10 rows is pre-fetched using the current connection role (PG internal behaviour)
                    -- then we have to reset it again otherwise it would use the role defined in the `set_config` above
                    -- to fetch the remaining rows when rows>10, which could be a user-defined role that lacks execution grants.
                    -- The flow is:
                    --   1. run batch with conn role
                    --   2. set_config working_role
                    --   3. execute walrus
                    --   4. reset role (revert)
                    --   5. repeat
                    perform set_config('role', null, true);

                    if subscription_has_access then
                        visible_role_sub_ids = visible_role_sub_ids || subscription_id;
                    end if;
                end if;
            end loop;

            perform set_config('role', null, true);

            -- Inner loop: per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;

                output = jsonb_build_object(
                    'schema', wal ->> 'schema',
                    'table', wal ->> 'table',
                    'type', action,
                    'commit_timestamp', to_char(
                        ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                    ),
                    'columns', (
                        select
                            jsonb_agg(
                                jsonb_build_object(
                                    'name', pa.attname,
                                    'type', pt.typname
                                )
                                order by pa.attnum asc
                            )
                        from
                            pg_attribute pa
                            join pg_type pt
                                on pa.atttypid = pt.oid
                            left join (
                                select unnest(conkey) as pkey_attnum
                                from pg_constraint
                                where conrelid = entity_ and contype = 'p'
                            ) pk on pk.pkey_attnum = pa.attnum
                        where
                            attrelid = entity_
                            and attnum > 0
                            and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
                            and (working_selected_columns is null or pa.attname = any(working_selected_columns) or pk.pkey_attnum is not null)
                    )
                )
                -- Add "record" key for insert and update
                || case
                    when action in ('INSERT', 'UPDATE') then
                        jsonb_build_object(
                            'record',
                            (
                                select
                                    jsonb_object_agg(
                                        -- if unchanged toast, get column name and value from old record
                                        coalesce((c).name, (oc).name),
                                        case
                                            when (c).name is null then (oc).value
                                            else (c).value
                                        end
                                    )
                                from
                                    unnest(columns) c
                                    full outer join unnest(old_columns) oc
                                        on (c).name = (oc).name
                                where
                                    coalesce((c).is_selectable, (oc).is_selectable)
                                    and (working_selected_columns is null or coalesce((c).name, (oc).name) = any(working_selected_columns) or coalesce((c).is_pkey, (oc).is_pkey))
                                    and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            )
                        )
                    else '{}'::jsonb
                end
                -- Add "old_record" key for update and delete
                || case
                    when action = 'UPDATE' then
                        jsonb_build_object(
                                'old_record',
                                (
                                    select jsonb_object_agg((c).name, (c).value)
                                    from unnest(old_columns) c
                                    where
                                        (c).is_selectable
                                        and (working_selected_columns is null or (c).name = any(working_selected_columns) or (c).is_pkey)
                                        and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                                )
                            )
                    when action = 'DELETE' then
                        jsonb_build_object(
                            'old_record',
                            (
                                select jsonb_object_agg((c).name, (c).value)
                                from unnest(old_columns) c
                                where
                                    (c).is_selectable
                                    and (working_selected_columns is null or (c).name = any(working_selected_columns) or (c).is_pkey)
                                    and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                                    and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                            )
                        )
                    else '{}'::jsonb
                end;

                -- Filter visible_role_sub_ids to those matching the current selected_columns group
                visible_to_subscription_ids = coalesce(
                    (
                        select array_agg(s.subscription_id)
                        from unnest(subscriptions) s
                        where s.claims_role = working_role
                          and (s.selected_columns is not distinct from working_selected_columns)
                          and s.subscription_id = any(visible_role_sub_ids)
                    ),
                    '{}'::uuid[]
                );

                return next (
                    output,
                    is_rls_enabled,
                    visible_to_subscription_ids,
                    case
                        when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                        else '{}'
                    end
                )::realtime.wal_rls;
            end loop;

        end if;
    end loop;

    perform set_config('role', null, true);
end;
$$;


ALTER FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) OWNER TO supabase_realtime_admin;

--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


ALTER FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) OWNER TO supabase_realtime_admin;

--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


ALTER FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) OWNER TO supabase_realtime_admin;

--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
declare
  res jsonb;
begin
  if type_::text = 'bytea' then
    return to_jsonb(val);
  end if;
  execute format('select to_jsonb(%L::'|| type_::text || ')', val) into res;
  return res;
end
$$;


ALTER FUNCTION realtime."cast"(val text, type_ regtype) OWNER TO supabase_realtime_admin;

--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
/*
Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
*/
declare
    op_symbol text = (
        case
            when op = 'eq' then '='
            when op = 'neq' then '!='
            when op = 'lt' then '<'
            when op = 'lte' then '<='
            when op = 'gt' then '>'
            when op = 'gte' then '>='
            when op = 'in' then '= any'
            else 'UNKNOWN OP'
        end
    );
    res boolean;
begin
    execute format(
        'select %L::'|| type_::text || ' ' || op_symbol
        || ' ( %L::'
        || (
            case
                when op = 'in' then type_::text || '[]'
                else type_::text end
        )
        || ')', val_1, val_2) into res;
    return res;
end;
$$;


ALTER FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) OWNER TO supabase_realtime_admin;

--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) RETURNS boolean
    LANGUAGE plpgsql STABLE
    AS $$
declare
    op_symbol text;
    res boolean;
begin
    -- IS DISTINCT FROM / IS NOT DISTINCT FROM: infix, both sides typed literals
    if op = 'isdistinct' then
        execute format(
            'select %L::%s %s %L::%s',
            val_1,
            type_::text,
            case when negate then 'IS NOT DISTINCT FROM' else 'IS DISTINCT FROM' end,
            val_2,
            type_::text
        ) into res;
        return res;
    end if;

    -- IS requires a keyword RHS (NULL, TRUE, FALSE, UNKNOWN), not a typed literal
    if op = 'is' then
        if val_2 not in ('null', 'true', 'false', 'unknown') then
            raise exception 'invalid value for is filter: must be null, true, false, or unknown';
        end if;
        execute format(
            'select %L::%s %s %s',
            val_1,
            type_::text,
            case when negate then 'IS NOT' else 'IS' end,
            upper(val_2)
        ) into res;
        return res;
    end if;

    op_symbol = case
        when op = 'eq'    then '='
        when op = 'neq'   then '!='
        when op = 'lt'    then '<'
        when op = 'lte'   then '<='
        when op = 'gt'    then '>'
        when op = 'gte'   then '>='
        when op = 'in'    then '= any'
        when op = 'like'   then 'LIKE'
        when op = 'ilike'  then 'ILIKE'
        when op = 'match'  then '~'
        when op = 'imatch' then '~*'
        else null
    end;

    if op_symbol is null then
        raise exception 'unsupported equality operator: %', op::text;
    end if;

    execute format(
        'select %L::%s %s (%L::%s)',
        val_1,
        type_::text,
        op_symbol,
        val_2,
        case when op = 'in' then type_::text || '[]' else type_::text end
    ) into res;

    return case when negate then not res else res end;
end;
$$;


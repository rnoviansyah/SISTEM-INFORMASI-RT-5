GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO dashboard_user;


--
-- Name: FUNCTION uuid_nil(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_nil() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_dns(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_dns() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_oid(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_oid() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_url(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_url() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_x500(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_x500() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO dashboard_user;


--
-- Name: FUNCTION graphql("operationName" text, query text, variables jsonb, extensions jsonb); Type: ACL; Schema: graphql_public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO postgres;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO anon;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO authenticated;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO service_role;


--
-- Name: FUNCTION pg_reload_conf(); Type: ACL; Schema: pg_catalog; Owner: supabase_admin
--

GRANT ALL ON FUNCTION pg_catalog.pg_reload_conf() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION get_auth(p_usename text); Type: ACL; Schema: pgbouncer; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION pgbouncer.get_auth(p_usename text) FROM PUBLIC;
GRANT ALL ON FUNCTION pgbouncer.get_auth(p_usename text) TO pgbouncer;


--
-- Name: FUNCTION _bansos_expired_ts(p_val text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public._bansos_expired_ts(p_val text) TO anon;
GRANT ALL ON FUNCTION public._bansos_expired_ts(p_val text) TO authenticated;
GRANT ALL ON FUNCTION public._bansos_expired_ts(p_val text) TO service_role;


--
-- Name: FUNCTION _bcrypt_check(p_password text, p_hash text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public._bcrypt_check(p_password text, p_hash text) TO anon;
GRANT ALL ON FUNCTION public._bcrypt_check(p_password text, p_hash text) TO authenticated;
GRANT ALL ON FUNCTION public._bcrypt_check(p_password text, p_hash text) TO service_role;


--
-- Name: FUNCTION _bcrypt_hash(p_password text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public._bcrypt_hash(p_password text) TO anon;
GRANT ALL ON FUNCTION public._bcrypt_hash(p_password text) TO authenticated;
GRANT ALL ON FUNCTION public._bcrypt_hash(p_password text) TO service_role;


--
-- Name: FUNCTION _bcrypt_limit(p_password text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public._bcrypt_limit(p_password text) TO anon;
GRANT ALL ON FUNCTION public._bcrypt_limit(p_password text) TO authenticated;
GRANT ALL ON FUNCTION public._bcrypt_limit(p_password text) TO service_role;


--
-- Name: FUNCTION _col_exists(p_qname text, p_col text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public._col_exists(p_qname text, p_col text) TO anon;
GRANT ALL ON FUNCTION public._col_exists(p_qname text, p_col text) TO authenticated;
GRANT ALL ON FUNCTION public._col_exists(p_qname text, p_col text) TO service_role;


--
-- Name: FUNCTION _dec_data(p_cipher text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public._dec_data(p_cipher text) TO anon;
GRANT ALL ON FUNCTION public._dec_data(p_cipher text) TO authenticated;
GRANT ALL ON FUNCTION public._dec_data(p_cipher text) TO service_role;


--
-- Name: FUNCTION _decrypt_row(p_row jsonb, p_allowed boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public._decrypt_row(p_row jsonb, p_allowed boolean) TO anon;
GRANT ALL ON FUNCTION public._decrypt_row(p_row jsonb, p_allowed boolean) TO authenticated;
GRANT ALL ON FUNCTION public._decrypt_row(p_row jsonb, p_allowed boolean) TO service_role;


--
-- Name: FUNCTION _enc_data(p_plain text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public._enc_data(p_plain text) TO anon;
GRANT ALL ON FUNCTION public._enc_data(p_plain text) TO authenticated;
GRANT ALL ON FUNCTION public._enc_data(p_plain text) TO service_role;


--
-- Name: FUNCTION _encrypt_row(p_row jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public._encrypt_row(p_row jsonb) TO anon;
GRANT ALL ON FUNCTION public._encrypt_row(p_row jsonb) TO authenticated;
GRANT ALL ON FUNCTION public._encrypt_row(p_row jsonb) TO service_role;


--
-- Name: FUNCTION _is_enc(p_val text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public._is_enc(p_val text) TO anon;
GRANT ALL ON FUNCTION public._is_enc(p_val text) TO authenticated;
GRANT ALL ON FUNCTION public._is_enc(p_val text) TO service_role;


--
-- Name: FUNCTION _is_image_base64(p_b64 text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public._is_image_base64(p_b64 text) TO anon;
GRANT ALL ON FUNCTION public._is_image_base64(p_b64 text) TO authenticated;
GRANT ALL ON FUNCTION public._is_image_base64(p_b64 text) TO service_role;


--
-- Name: FUNCTION _keuangan_ts(p_tanggal text, p_created_at text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public._keuangan_ts(p_tanggal text, p_created_at text) TO anon;
GRANT ALL ON FUNCTION public._keuangan_ts(p_tanggal text, p_created_at text) TO authenticated;
GRANT ALL ON FUNCTION public._keuangan_ts(p_tanggal text, p_created_at text) TO service_role;


--
-- Name: FUNCTION _login_lock_check(p_username text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public._login_lock_check(p_username text) TO anon;
GRANT ALL ON FUNCTION public._login_lock_check(p_username text) TO authenticated;
GRANT ALL ON FUNCTION public._login_lock_check(p_username text) TO service_role;


--
-- Name: FUNCTION _login_lock_clear(p_username text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public._login_lock_clear(p_username text) TO anon;
GRANT ALL ON FUNCTION public._login_lock_clear(p_username text) TO authenticated;
GRANT ALL ON FUNCTION public._login_lock_clear(p_username text) TO service_role;


--
-- Name: FUNCTION _login_lock_fail(p_username text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public._login_lock_fail(p_username text) TO anon;
GRANT ALL ON FUNCTION public._login_lock_fail(p_username text) TO authenticated;
GRANT ALL ON FUNCTION public._login_lock_fail(p_username text) TO service_role;


--
-- Name: FUNCTION _normalize_row(p_row jsonb, p_qname text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public._normalize_row(p_row jsonb, p_qname text) TO anon;
GRANT ALL ON FUNCTION public._normalize_row(p_row jsonb, p_qname text) TO authenticated;
GRANT ALL ON FUNCTION public._normalize_row(p_row jsonb, p_qname text) TO service_role;


--
-- Name: FUNCTION _qname(p_table text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public._qname(p_table text) TO anon;
GRANT ALL ON FUNCTION public._qname(p_table text) TO authenticated;
GRANT ALL ON FUNCTION public._qname(p_table text) TO service_role;


--
-- Name: FUNCTION _row_owner_match(p_row jsonb, p_nik text, p_nama text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public._row_owner_match(p_row jsonb, p_nik text, p_nama text) TO anon;
GRANT ALL ON FUNCTION public._row_owner_match(p_row jsonb, p_nik text, p_nama text) TO authenticated;
GRANT ALL ON FUNCTION public._row_owner_match(p_row jsonb, p_nik text, p_nama text) TO service_role;


--
-- Name: FUNCTION _sha(p_text text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public._sha(p_text text) TO anon;
GRANT ALL ON FUNCTION public._sha(p_text text) TO authenticated;
GRANT ALL ON FUNCTION public._sha(p_text text) TO service_role;


--
-- Name: FUNCTION auth_role(p_token text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.auth_role(p_token text) TO anon;
GRANT ALL ON FUNCTION public.auth_role(p_token text) TO authenticated;
GRANT ALL ON FUNCTION public.auth_role(p_token text) TO service_role;


--
-- Name: FUNCTION cek_bansos_public(p_token text, p_query text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cek_bansos_public(p_token text, p_query text) TO anon;
GRANT ALL ON FUNCTION public.cek_bansos_public(p_token text, p_query text) TO authenticated;
GRANT ALL ON FUNCTION public.cek_bansos_public(p_token text, p_query text) TO service_role;


--
-- Name: FUNCTION cleanup_database_secured(p_token text, p_password text, p_table_name text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cleanup_database_secured(p_token text, p_password text, p_table_name text) TO anon;
GRANT ALL ON FUNCTION public.cleanup_database_secured(p_token text, p_password text, p_table_name text) TO authenticated;
GRANT ALL ON FUNCTION public.cleanup_database_secured(p_token text, p_password text, p_table_name text) TO service_role;


--
-- Name: FUNCTION cleanup_orphan_storage_secured(p_token text, p_password text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cleanup_orphan_storage_secured(p_token text, p_password text) TO anon;
GRANT ALL ON FUNCTION public.cleanup_orphan_storage_secured(p_token text, p_password text) TO authenticated;
GRANT ALL ON FUNCTION public.cleanup_orphan_storage_secured(p_token text, p_password text) TO service_role;


--
-- Name: FUNCTION delete_data_secured(p_table_name text, p_id_column text, p_id_value text, p_token text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.delete_data_secured(p_table_name text, p_id_column text, p_id_value text, p_token text) TO anon;
GRANT ALL ON FUNCTION public.delete_data_secured(p_table_name text, p_id_column text, p_id_value text, p_token text) TO authenticated;
GRANT ALL ON FUNCTION public.delete_data_secured(p_table_name text, p_id_column text, p_id_value text, p_token text) TO service_role;


--
-- Name: FUNCTION delete_session_secured(p_token text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.delete_session_secured(p_token text) TO anon;
GRANT ALL ON FUNCTION public.delete_session_secured(p_token text) TO authenticated;
GRANT ALL ON FUNCTION public.delete_session_secured(p_token text) TO service_role;


--
-- Name: FUNCTION delete_storage_files_secured(p_token text, p_password text, p_paths text[]); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.delete_storage_files_secured(p_token text, p_password text, p_paths text[]) TO anon;
GRANT ALL ON FUNCTION public.delete_storage_files_secured(p_token text, p_password text, p_paths text[]) TO authenticated;
GRANT ALL ON FUNCTION public.delete_storage_files_secured(p_token text, p_password text, p_paths text[]) TO service_role;


--
-- Name: FUNCTION delete_user_secured(p_token text, p_username text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.delete_user_secured(p_token text, p_username text) TO anon;
GRANT ALL ON FUNCTION public.delete_user_secured(p_token text, p_username text) TO authenticated;
GRANT ALL ON FUNCTION public.delete_user_secured(p_token text, p_username text) TO service_role;


--
-- Name: FUNCTION delete_warga_secured(p_token text, p_id text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.delete_warga_secured(p_token text, p_id text) TO anon;
GRANT ALL ON FUNCTION public.delete_warga_secured(p_token text, p_id text) TO authenticated;
GRANT ALL ON FUNCTION public.delete_warga_secured(p_token text, p_id text) TO service_role;


--
-- Name: FUNCTION generic_delete_secured(p_table text, p_token text, p_id_col text, p_id_val text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.generic_delete_secured(p_table text, p_token text, p_id_col text, p_id_val text) TO anon;
GRANT ALL ON FUNCTION public.generic_delete_secured(p_table text, p_token text, p_id_col text, p_id_val text) TO authenticated;
GRANT ALL ON FUNCTION public.generic_delete_secured(p_table text, p_token text, p_id_col text, p_id_val text) TO service_role;


--
-- Name: FUNCTION generic_insert_secured(p_table text, p_token text, p_row jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.generic_insert_secured(p_table text, p_token text, p_row jsonb) TO anon;
GRANT ALL ON FUNCTION public.generic_insert_secured(p_table text, p_token text, p_row jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.generic_insert_secured(p_table text, p_token text, p_row jsonb) TO service_role;


--
-- Name: FUNCTION generic_select_secured(p_table text, p_token text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.generic_select_secured(p_table text, p_token text) TO anon;
GRANT ALL ON FUNCTION public.generic_select_secured(p_table text, p_token text) TO authenticated;
GRANT ALL ON FUNCTION public.generic_select_secured(p_table text, p_token text) TO service_role;


--
-- Name: FUNCTION generic_update_secured(p_table text, p_token text, p_id_col text, p_id_val text, p_row jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.generic_update_secured(p_table text, p_token text, p_id_col text, p_id_val text, p_row jsonb) TO anon;
GRANT ALL ON FUNCTION public.generic_update_secured(p_table text, p_token text, p_id_col text, p_id_val text, p_row jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.generic_update_secured(p_table text, p_token text, p_id_col text, p_id_val text, p_row jsonb) TO service_role;


--
-- Name: FUNCTION get_aset_page_secured(p_token text, p_tab text, p_page integer, p_page_size integer, p_search text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_aset_page_secured(p_token text, p_tab text, p_page integer, p_page_size integer, p_search text) TO anon;
GRANT ALL ON FUNCTION public.get_aset_page_secured(p_token text, p_tab text, p_page integer, p_page_size integer, p_search text) TO authenticated;
GRANT ALL ON FUNCTION public.get_aset_page_secured(p_token text, p_tab text, p_page integer, p_page_size integer, p_search text) TO service_role;


--
-- Name: FUNCTION get_auth_nik(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_auth_nik() TO anon;
GRANT ALL ON FUNCTION public.get_auth_nik() TO authenticated;
GRANT ALL ON FUNCTION public.get_auth_nik() TO service_role;


--
-- Name: FUNCTION get_auth_role(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_auth_role() TO anon;
GRANT ALL ON FUNCTION public.get_auth_role() TO authenticated;
GRANT ALL ON FUNCTION public.get_auth_role() TO service_role;


--
-- Name: FUNCTION get_bansos_page_secured(p_token text, p_page integer, p_page_size integer, p_search text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_bansos_page_secured(p_token text, p_page integer, p_page_size integer, p_search text) TO anon;
GRANT ALL ON FUNCTION public.get_bansos_page_secured(p_token text, p_page integer, p_page_size integer, p_search text) TO authenticated;
GRANT ALL ON FUNCTION public.get_bansos_page_secured(p_token text, p_page integer, p_page_size integer, p_search text) TO service_role;


--
-- Name: FUNCTION get_iuran_page_secured(p_token text, p_page integer, p_page_size integer, p_search text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_iuran_page_secured(p_token text, p_page integer, p_page_size integer, p_search text) TO anon;
GRANT ALL ON FUNCTION public.get_iuran_page_secured(p_token text, p_page integer, p_page_size integer, p_search text) TO authenticated;
GRANT ALL ON FUNCTION public.get_iuran_page_secured(p_token text, p_page integer, p_page_size integer, p_search text) TO service_role;


--
-- Name: FUNCTION get_keuangan_page_secured(p_token text, p_page integer, p_page_size integer, p_search text, p_periode text, p_date_from text, p_date_to text, p_order text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_keuangan_page_secured(p_token text, p_page integer, p_page_size integer, p_search text, p_periode text, p_date_from text, p_date_to text, p_order text) TO anon;
GRANT ALL ON FUNCTION public.get_keuangan_page_secured(p_token text, p_page integer, p_page_size integer, p_search text, p_periode text, p_date_from text, p_date_to text, p_order text) TO authenticated;
GRANT ALL ON FUNCTION public.get_keuangan_page_secured(p_token text, p_page integer, p_page_size integer, p_search text, p_periode text, p_date_from text, p_date_to text, p_order text) TO service_role;


--
-- Name: FUNCTION get_keuangan_summary_secured(p_token text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_keuangan_summary_secured(p_token text) TO anon;
GRANT ALL ON FUNCTION public.get_keuangan_summary_secured(p_token text) TO authenticated;
GRANT ALL ON FUNCTION public.get_keuangan_summary_secured(p_token text) TO service_role;


--
-- Name: FUNCTION get_notifications_secured(p_token text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_notifications_secured(p_token text) TO anon;
GRANT ALL ON FUNCTION public.get_notifications_secured(p_token text) TO authenticated;
GRANT ALL ON FUNCTION public.get_notifications_secured(p_token text) TO service_role;


--
-- Name: FUNCTION get_real_database_stats(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_real_database_stats() TO anon;
GRANT ALL ON FUNCTION public.get_real_database_stats() TO authenticated;
GRANT ALL ON FUNCTION public.get_real_database_stats() TO service_role;


--
-- Name: FUNCTION get_server_time(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_server_time() TO anon;
GRANT ALL ON FUNCTION public.get_server_time() TO authenticated;
GRANT ALL ON FUNCTION public.get_server_time() TO service_role;


--
-- Name: FUNCTION get_sessions_secured(p_token text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_sessions_secured(p_token text) TO anon;
GRANT ALL ON FUNCTION public.get_sessions_secured(p_token text) TO authenticated;
GRANT ALL ON FUNCTION public.get_sessions_secured(p_token text) TO service_role;


--
-- Name: FUNCTION get_table_page_secured(p_token text, p_table text, p_page integer, p_page_size integer, p_search text, p_filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_table_page_secured(p_token text, p_table text, p_page integer, p_page_size integer, p_search text, p_filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.get_table_page_secured(p_token text, p_table text, p_page integer, p_page_size integer, p_search text, p_filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.get_table_page_secured(p_token text, p_table text, p_page integer, p_page_size integer, p_search text, p_filter jsonb) TO service_role;


--
-- Name: FUNCTION get_usage_result(p_request_id bigint); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_usage_result(p_request_id bigint) TO anon;
GRANT ALL ON FUNCTION public.get_usage_result(p_request_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.get_usage_result(p_request_id bigint) TO service_role;


--
-- Name: FUNCTION get_usage_secured(p_token text, p_org_slug text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_usage_secured(p_token text, p_org_slug text) TO anon;
GRANT ALL ON FUNCTION public.get_usage_secured(p_token text, p_org_slug text) TO authenticated;
GRANT ALL ON FUNCTION public.get_usage_secured(p_token text, p_org_slug text) TO service_role;


--
-- Name: FUNCTION get_usage_secured(p_token text, p_org_slug text, p_ref text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_usage_secured(p_token text, p_org_slug text, p_ref text) TO anon;
GRANT ALL ON FUNCTION public.get_usage_secured(p_token text, p_org_slug text, p_ref text) TO authenticated;
GRANT ALL ON FUNCTION public.get_usage_secured(p_token text, p_org_slug text, p_ref text) TO service_role;


--
-- Name: FUNCTION get_users_secured(p_token text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_users_secured(p_token text) TO anon;
GRANT ALL ON FUNCTION public.get_users_secured(p_token text) TO authenticated;
GRANT ALL ON FUNCTION public.get_users_secured(p_token text) TO service_role;


--
-- Name: FUNCTION get_warga_page_secured(p_token text, p_mode text, p_page integer, p_page_size integer, p_search text, p_status text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_warga_page_secured(p_token text, p_mode text, p_page integer, p_page_size integer, p_search text, p_status text) TO anon;
GRANT ALL ON FUNCTION public.get_warga_page_secured(p_token text, p_mode text, p_page integer, p_page_size integer, p_search text, p_status text) TO authenticated;
GRANT ALL ON FUNCTION public.get_warga_page_secured(p_token text, p_mode text, p_page integer, p_page_size integer, p_search text, p_status text) TO service_role;


--
-- Name: FUNCTION get_warga_rumah_detail_secured(p_token text, p_alamat text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_warga_rumah_detail_secured(p_token text, p_alamat text) TO anon;
GRANT ALL ON FUNCTION public.get_warga_rumah_detail_secured(p_token text, p_alamat text) TO authenticated;
GRANT ALL ON FUNCTION public.get_warga_rumah_detail_secured(p_token text, p_alamat text) TO service_role;


--
-- Name: FUNCTION get_warga_secured(p_token text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_warga_secured(p_token text) TO anon;
GRANT ALL ON FUNCTION public.get_warga_secured(p_token text) TO authenticated;
GRANT ALL ON FUNCTION public.get_warga_secured(p_token text) TO service_role;


--
-- Name: FUNCTION is_rt(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_rt() TO anon;
GRANT ALL ON FUNCTION public.is_rt() TO authenticated;
GRANT ALL ON FUNCTION public.is_rt() TO service_role;


--
-- Name: FUNCTION is_valid_rt(p_token text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_valid_rt(p_token text) TO anon;
GRANT ALL ON FUNCTION public.is_valid_rt(p_token text) TO authenticated;
GRANT ALL ON FUNCTION public.is_valid_rt(p_token text) TO service_role;


--
-- Name: FUNCTION login_secured(p_username text, p_password text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.login_secured(p_username text, p_password text) TO anon;
GRANT ALL ON FUNCTION public.login_secured(p_username text, p_password text) TO authenticated;
GRANT ALL ON FUNCTION public.login_secured(p_username text, p_password text) TO service_role;


--
-- Name: FUNCTION save_session_secured(p_token text, p_nik text, p_role text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.save_session_secured(p_token text, p_nik text, p_role text) TO anon;
GRANT ALL ON FUNCTION public.save_session_secured(p_token text, p_nik text, p_role text) TO authenticated;
GRANT ALL ON FUNCTION public.save_session_secured(p_token text, p_nik text, p_role text) TO service_role;


--
-- Name: FUNCTION save_user_secured(p_token text, p_data jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.save_user_secured(p_token text, p_data jsonb) TO anon;
GRANT ALL ON FUNCTION public.save_user_secured(p_token text, p_data jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.save_user_secured(p_token text, p_data jsonb) TO service_role;


--
-- Name: FUNCTION save_warga_secured(p_token text, p_data jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.save_warga_secured(p_token text, p_data jsonb) TO anon;
GRANT ALL ON FUNCTION public.save_warga_secured(p_token text, p_data jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.save_warga_secured(p_token text, p_data jsonb) TO service_role;


--
-- Name: FUNCTION storage_api_delete(p_paths text[]); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.storage_api_delete(p_paths text[]) TO anon;
GRANT ALL ON FUNCTION public.storage_api_delete(p_paths text[]) TO authenticated;
GRANT ALL ON FUNCTION public.storage_api_delete(p_paths text[]) TO service_role;


--
-- Name: FUNCTION storage_get_delete_result(p_request_id bigint); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.storage_get_delete_result(p_request_id bigint) TO anon;
GRANT ALL ON FUNCTION public.storage_get_delete_result(p_request_id bigint) TO authenticated;
GRANT ALL ON FUNCTION public.storage_get_delete_result(p_request_id bigint) TO service_role;


--
-- Name: FUNCTION trg_users_hash_password(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trg_users_hash_password() TO anon;
GRANT ALL ON FUNCTION public.trg_users_hash_password() TO authenticated;
GRANT ALL ON FUNCTION public.trg_users_hash_password() TO service_role;


--
-- Name: FUNCTION truncate_table_secured(p_table_name text, p_token text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.truncate_table_secured(p_table_name text, p_token text) TO anon;
GRANT ALL ON FUNCTION public.truncate_table_secured(p_table_name text, p_token text) TO authenticated;
GRANT ALL ON FUNCTION public.truncate_table_secured(p_table_name text, p_token text) TO service_role;


--
-- Name: FUNCTION update_user_secured(p_token text, p_old_username text, p_data jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_user_secured(p_token text, p_old_username text, p_data jsonb) TO anon;
GRANT ALL ON FUNCTION public.update_user_secured(p_token text, p_old_username text, p_data jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.update_user_secured(p_token text, p_old_username text, p_data jsonb) TO service_role;


--
-- Name: FUNCTION update_warga_secured(p_token text, p_id text, p_data jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_warga_secured(p_token text, p_id text, p_data jsonb) TO anon;
GRANT ALL ON FUNCTION public.update_warga_secured(p_token text, p_id text, p_data jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.update_warga_secured(p_token text, p_id text, p_data jsonb) TO service_role;


--
-- Name: FUNCTION upload_file_secured(p_token text, p_path text, p_base64 text, p_content_type text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.upload_file_secured(p_token text, p_path text, p_base64 text, p_content_type text) TO anon;
GRANT ALL ON FUNCTION public.upload_file_secured(p_token text, p_path text, p_base64 text, p_content_type text) TO authenticated;
GRANT ALL ON FUNCTION public.upload_file_secured(p_token text, p_path text, p_base64 text, p_content_type text) TO service_role;


--
-- Name: FUNCTION verify_user_login(p_username text, p_password text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.verify_user_login(p_username text, p_password text) TO anon;
GRANT ALL ON FUNCTION public.verify_user_login(p_username text, p_password text) TO authenticated;
GRANT ALL ON FUNCTION public.verify_user_login(p_username text, p_password text) TO service_role;


--
-- Name: FUNCTION apply_rls(wal jsonb, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO anon;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO authenticated;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO service_role;


--
-- Name: FUNCTION broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO postgres;
GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO dashboard_user;


--
-- Name: FUNCTION build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO postgres;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO anon;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO service_role;


--
-- Name: FUNCTION "cast"(val text, type_ regtype); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO postgres;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO dashboard_user;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO anon;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO authenticated;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO service_role;


--
-- Name: FUNCTION check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO postgres;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO anon;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO authenticated;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO service_role;


--
-- Name: FUNCTION check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) TO postgres;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) TO anon;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) TO authenticated;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) TO service_role;


--
-- Name: FUNCTION is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO postgres;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO anon;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO service_role;


--
-- Name: FUNCTION list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO dashboard_user;


--
-- Name: FUNCTION quote_wal2json(entity regclass); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO postgres;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO anon;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO authenticated;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO service_role;


--
-- Name: FUNCTION send(payload jsonb, event text, topic text, private boolean); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO postgres;
GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO dashboard_user;


--
-- Name: FUNCTION send_binary(payload bytea, event text, topic text, private boolean); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.send_binary(payload bytea, event text, topic text, private boolean) TO postgres;
GRANT ALL ON FUNCTION realtime.send_binary(payload bytea, event text, topic text, private boolean) TO dashboard_user;


--
-- Name: FUNCTION subscription_check_filters(); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO postgres;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO dashboard_user;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO anon;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO authenticated;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO service_role;


--
-- Name: FUNCTION to_regrole(role_name text); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO postgres;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO anon;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO authenticated;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO service_role;


--
-- Name: FUNCTION topic(); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.topic() TO postgres;
GRANT ALL ON FUNCTION realtime.topic() TO dashboard_user;


--
-- Name: FUNCTION wal2json_escape_identifier(name text); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.wal2json_escape_identifier(name text) TO postgres;
GRANT ALL ON FUNCTION realtime.wal2json_escape_identifier(name text) TO dashboard_user;


--
-- Name: FUNCTION _crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO service_role;


--
-- Name: FUNCTION create_secret(new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: FUNCTION update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: TABLE audit_log_entries; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.audit_log_entries TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.audit_log_entries TO postgres;
GRANT SELECT ON TABLE auth.audit_log_entries TO postgres WITH GRANT OPTION;


--
-- Name: TABLE custom_oauth_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.custom_oauth_providers TO postgres;
GRANT ALL ON TABLE auth.custom_oauth_providers TO dashboard_user;


--
-- Name: TABLE flow_state; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.flow_state TO postgres;
GRANT SELECT ON TABLE auth.flow_state TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.flow_state TO dashboard_user;


--
-- Name: TABLE identities; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.identities TO postgres;
GRANT SELECT ON TABLE auth.identities TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.identities TO dashboard_user;


--
-- Name: TABLE instances; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.instances TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.instances TO postgres;
GRANT SELECT ON TABLE auth.instances TO postgres WITH GRANT OPTION;


--
-- Name: TABLE mfa_amr_claims; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_amr_claims TO postgres;
GRANT SELECT ON TABLE auth.mfa_amr_claims TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_amr_claims TO dashboard_user;


--
-- Name: TABLE mfa_challenges; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_challenges TO postgres;
GRANT SELECT ON TABLE auth.mfa_challenges TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_challenges TO dashboard_user;


--
-- Name: TABLE mfa_factors; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_factors TO postgres;
GRANT SELECT ON TABLE auth.mfa_factors TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_factors TO dashboard_user;


--
-- Name: TABLE oauth_authorizations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_authorizations TO postgres;
GRANT ALL ON TABLE auth.oauth_authorizations TO dashboard_user;


--
-- Name: TABLE oauth_client_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_client_states TO postgres;
GRANT ALL ON TABLE auth.oauth_client_states TO dashboard_user;


--
-- Name: TABLE oauth_clients; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_clients TO postgres;
GRANT ALL ON TABLE auth.oauth_clients TO dashboard_user;


--
-- Name: TABLE oauth_consents; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_consents TO postgres;
GRANT ALL ON TABLE auth.oauth_consents TO dashboard_user;


--
-- Name: TABLE one_time_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.one_time_tokens TO postgres;
GRANT SELECT ON TABLE auth.one_time_tokens TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.one_time_tokens TO dashboard_user;


--
-- Name: TABLE refresh_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.refresh_tokens TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.refresh_tokens TO postgres;
GRANT SELECT ON TABLE auth.refresh_tokens TO postgres WITH GRANT OPTION;


--
-- Name: SEQUENCE refresh_tokens_id_seq; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO dashboard_user;
GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO postgres;


--
-- Name: TABLE saml_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_providers TO postgres;
GRANT SELECT ON TABLE auth.saml_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_providers TO dashboard_user;


--
-- Name: TABLE saml_relay_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_relay_states TO postgres;
GRANT SELECT ON TABLE auth.saml_relay_states TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_relay_states TO dashboard_user;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT ON TABLE auth.schema_migrations TO postgres WITH GRANT OPTION;


--
-- Name: TABLE sessions; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sessions TO postgres;
GRANT SELECT ON TABLE auth.sessions TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sessions TO dashboard_user;


--
-- Name: TABLE sso_domains; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_domains TO postgres;
GRANT SELECT ON TABLE auth.sso_domains TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_domains TO dashboard_user;
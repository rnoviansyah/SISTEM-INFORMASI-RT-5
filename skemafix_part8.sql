ALTER TABLE public."Kematian" OWNER TO postgres;

--
-- Name: Keuangan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Keuangan" (
    id text NOT NULL,
    tanggal text,
    pemasukan numeric,
    pengeluaran numeric,
    keterangan text,
    foto_url text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public."Keuangan" OWNER TO postgres;

--
-- Name: LoginAttempts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."LoginAttempts" (
    username text NOT NULL,
    failed integer DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone
);


ALTER TABLE public."LoginAttempts" OWNER TO postgres;

--
-- Name: Notifikasi; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Notifikasi" (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    judul text,
    pesan text,
    url text,
    nik text,
    dibaca boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public."Notifikasi" OWNER TO postgres;

--
-- Name: Peminjaman; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Peminjaman" (
    id text NOT NULL,
    nama_peminjam text,
    id_barang text,
    nama_barang text,
    jumlah_minta numeric,
    acc numeric,
    keterangan text,
    catatan_rt text,
    status text,
    tanggal text,
    nik text,
    jumlah numeric,
    created_at timestamp with time zone DEFAULT now(),
    verified_at timestamp with time zone,
    nik_sha text
);


ALTER TABLE public."Peminjaman" OWNER TO postgres;

--
-- Name: Pengaduan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Pengaduan" (
    id text NOT NULL,
    nama text,
    nik text,
    no_hp text,
    jenis_aduan text,
    keterangan text,
    tanggal text,
    foto_url text,
    status text,
    foto_penyelesaian text,
    created_at timestamp with time zone DEFAULT now(),
    verified_at timestamp with time zone,
    nik_sha text
);


ALTER TABLE public."Pengaduan" OWNER TO postgres;

--
-- Name: Pengaturan_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Pengaturan_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Pengaturan_id_seq" OWNER TO postgres;

--
-- Name: Pengaturan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Pengaturan" (
    id bigint DEFAULT nextval('public."Pengaturan_id_seq"'::regclass) NOT NULL,
    kunci text,
    nilai text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public."Pengaturan" OWNER TO postgres;

--
-- Name: PindahKeluar; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PindahKeluar" (
    id text NOT NULL,
    nama text,
    nik text,
    no_kk text,
    alamat_tujuan text,
    rt numeric,
    rw numeric,
    tanggal_pindah text,
    created_at timestamp with time zone DEFAULT now(),
    nik_sha text,
    kk_sha text
);


ALTER TABLE public."PindahKeluar" OWNER TO postgres;

--
-- Name: PindahMasuk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PindahMasuk" (
    id text NOT NULL,
    nama text,
    nik text,
    no_kk text,
    asal text,
    alamat_baru text,
    rt numeric,
    tanggal_pindah text,
    status_pindah text,
    created_at timestamp with time zone DEFAULT now(),
    nik_sha text,
    kk_sha text
);


ALTER TABLE public."PindahMasuk" OWNER TO postgres;

--
-- Name: Sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Sessions" (
    token text NOT NULL,
    nik text,
    role text,
    createdat text,
    expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval),
    created_at timestamp with time zone DEFAULT now(),
    nik_sha text
);


ALTER TABLE public."Sessions" OWNER TO postgres;

--
-- Name: Sumbangan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Sumbangan" (
    id text NOT NULL,
    nama text,
    tanggal text,
    jenis_sumbangan text,
    keterangan text,
    nominal numeric,
    bukti_transfer text,
    status text,
    nik text,
    created_at timestamp with time zone DEFAULT now(),
    verified_at timestamp with time zone,
    nik_sha text
);


ALTER TABLE public."Sumbangan" OWNER TO postgres;

--
-- Name: SuratPengantar; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SuratPengantar" (
    id text NOT NULL,
    nama text,
    nik text,
    alamat text,
    rt numeric,
    jenis_surat text,
    status text,
    keterangan_admin text,
    keterangan text,
    ttd_pemohon text,
    created_at timestamp with time zone DEFAULT now(),
    verified_at timestamp with time zone,
    nik_sha text
);


ALTER TABLE public."SuratPengantar" OWNER TO postgres;

--
-- Name: Users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Users_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Users_id_seq" OWNER TO postgres;

--
-- Name: Users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Users" (
    id bigint DEFAULT nextval('public."Users_id_seq"'::regclass) NOT NULL,
    username text,
    password text,
    role text,
    nama text,
    nik text,
    created_at timestamp with time zone DEFAULT now(),
    nik_sha text
);


ALTER TABLE public."Users" OWNER TO postgres;

--
-- Name: Warga; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Warga" (
    id text NOT NULL,
    nama_lengkap text,
    nama_panggilan text,
    nik text,
    no_kk text,
    tempat_lahir text,
    tanggal_lahir text,
    jenis_kelamin text,
    alamat text,
    status_nikah text,
    status_tinggal text,
    pekerjaan text,
    no_hp text,
    foto_url text,
    created_at timestamp with time zone DEFAULT now(),
    nik_sha text,
    kk_sha text,
    status_keluarga text DEFAULT 'Anggota Keluarga'::text
);


ALTER TABLE public."Warga" OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea
)
PARTITION BY RANGE (inserted_at);


ALTER TABLE realtime.messages OWNER TO supabase_realtime_admin;

--
-- Name: messages_2026_08_13; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages_2026_08_13 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea,
    CONSTRAINT messages_payload_exclusive CHECK (((payload IS NULL) OR (binary_payload IS NULL)))
);


ALTER TABLE realtime.messages_2026_08_13 OWNER TO supabase_realtime_admin;

--
-- Name: messages_2026_08_14; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages_2026_08_14 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea,
    CONSTRAINT messages_payload_exclusive CHECK (((payload IS NULL) OR (binary_payload IS NULL)))
);


ALTER TABLE realtime.messages_2026_08_14 OWNER TO supabase_realtime_admin;

--
-- Name: messages_2026_08_15; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages_2026_08_15 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea,
    CONSTRAINT messages_payload_exclusive CHECK (((payload IS NULL) OR (binary_payload IS NULL)))
);


ALTER TABLE realtime.messages_2026_08_15 OWNER TO supabase_realtime_admin;

--
-- Name: messages_2026_08_16; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages_2026_08_16 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea,
    CONSTRAINT messages_payload_exclusive CHECK (((payload IS NULL) OR (binary_payload IS NULL)))
);


ALTER TABLE realtime.messages_2026_08_16 OWNER TO supabase_realtime_admin;

--
-- Name: messages_2026_08_17; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages_2026_08_17 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea,
    CONSTRAINT messages_payload_exclusive CHECK (((payload IS NULL) OR (binary_payload IS NULL)))
);


ALTER TABLE realtime.messages_2026_08_17 OWNER TO supabase_realtime_admin;

--
-- Name: messages_2026_08_18; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages_2026_08_18 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea,
    CONSTRAINT messages_payload_exclusive CHECK (((payload IS NULL) OR (binary_payload IS NULL)))
);


ALTER TABLE realtime.messages_2026_08_18 OWNER TO supabase_realtime_admin;

--
-- Name: messages_2026_08_19; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages_2026_08_19 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea,
    CONSTRAINT messages_payload_exclusive CHECK (((payload IS NULL) OR (binary_payload IS NULL)))
);


ALTER TABLE realtime.messages_2026_08_19 OWNER TO supabase_realtime_admin;

--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone DEFAULT now()
);


ALTER TABLE realtime.schema_migrations OWNER TO supabase_admin;

--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    action_filter text DEFAULT '*'::text,
    selected_columns text[],
    CONSTRAINT subscription_action_filter_check CHECK ((action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


ALTER TABLE realtime.subscription OWNER TO supabase_realtime_admin;

--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


ALTER TABLE storage.buckets OWNER TO supabase_storage_admin;

--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE storage.buckets_analytics OWNER TO supabase_storage_admin;

--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.buckets_vectors OWNER TO supabase_storage_admin;

--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE storage.migrations OWNER TO supabase_storage_admin;

--
-- Name: objects; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb
);


ALTER TABLE storage.objects OWNER TO supabase_storage_admin;

--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb,
    metadata jsonb
);


ALTER TABLE storage.s3_multipart_uploads OWNER TO supabase_storage_admin;

--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.s3_multipart_uploads_parts OWNER TO supabase_storage_admin;

--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.vector_indexes OWNER TO supabase_storage_admin;

--
-- Name: messages_2026_08_13; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_08_13 FOR VALUES FROM ('2026-08-13 00:00:00') TO ('2026-08-14 00:00:00');


--
-- Name: messages_2026_08_14; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_08_14 FOR VALUES FROM ('2026-08-14 00:00:00') TO ('2026-08-15 00:00:00');


--
-- Name: messages_2026_08_15; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_08_15 FOR VALUES FROM ('2026-08-15 00:00:00') TO ('2026-08-16 00:00:00');


--
-- Name: messages_2026_08_16; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_08_16 FOR VALUES FROM ('2026-08-16 00:00:00') TO ('2026-08-17 00:00:00');


--
-- Name: messages_2026_08_17; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_08_17 FOR VALUES FROM ('2026-08-17 00:00:00') TO ('2026-08-18 00:00:00');


--
-- Name: messages_2026_08_18; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_08_18 FOR VALUES FROM ('2026-08-18 00:00:00') TO ('2026-08-19 00:00:00');


--
-- Name: messages_2026_08_19; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_08_19 FOR VALUES FROM ('2026-08-19 00:00:00') TO ('2026-08-20 00:00:00');


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.audit_log_entries (instance_id, id, payload, created_at, ip_address) FROM stdin;
\.


--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.custom_oauth_providers (id, provider_type, identifier, name, client_id, client_secret, acceptable_client_ids, scopes, pkce_enabled, attribute_mapping, authorization_params, enabled, email_optional, issuer, discovery_url, skip_nonce_check, cached_discovery, discovery_cached_at, authorization_url, token_url, userinfo_url, jwks_uri, created_at, updated_at, custom_claims_allowlist) FROM stdin;
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.flow_state (id, user_id, auth_code, code_challenge_method, code_challenge, provider_type, provider_access_token, provider_refresh_token, created_at, updated_at, authentication_method, auth_code_issued_at, invite_token, referrer, oauth_client_state_id, linking_target_id, email_optional) FROM stdin;
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
rizky@rt5.local	453a054f-5b39-4edc-86b0-1871d8b40b50	{"sub": "453a054f-5b39-4edc-86b0-1871d8b40b50", "email": "rizky@rt5.local"}	email	2026-08-07 07:16:56.90289+00	2026-08-07 07:16:56.90289+00	2026-08-07 07:16:56.90289+00	453a054f-5b39-4edc-86b0-1871d8b40b50
kodok@rt5.local	adf0872d-b064-41fa-98fd-036f65a83f4c	{"sub": "adf0872d-b064-41fa-98fd-036f65a83f4c", "email": "kodok@rt5.local"}	email	2026-08-07 07:38:36.421799+00	2026-08-07 07:38:36.421799+00	2026-08-07 07:38:36.421799+00	adf0872d-b064-41fa-98fd-036f65a83f4c
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.instances (id, uuid, raw_base_config, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_amr_claims (session_id, created_at, updated_at, authentication_method, id) FROM stdin;
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_challenges (id, factor_id, created_at, verified_at, ip_address, otp_code, web_authn_session_data) FROM stdin;
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret, phone, last_challenged_at, web_authn_credential, web_authn_aaguid, last_webauthn_challenge_data) FROM stdin;
\.


--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.oauth_authorizations (id, authorization_id, client_id, user_id, redirect_uri, scope, state, resource, code_challenge, code_challenge_method, response_type, status, authorization_code, created_at, expires_at, approved_at, nonce) FROM stdin;
\.


--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.oauth_client_states (id, provider_type, code_verifier, created_at) FROM stdin;
\.


--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.oauth_clients (id, client_secret_hash, registration_type, redirect_uris, grant_types, client_name, client_uri, logo_uri, created_at, updated_at, deleted_at, client_type, token_endpoint_auth_method) FROM stdin;
\.


--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.oauth_consents (id, user_id, client_id, scopes, granted_at, revoked_at) FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.refresh_tokens (instance_id, id, token, user_id, revoked, created_at, updated_at, parent, session_id) FROM stdin;
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.saml_providers (id, sso_provider_id, entity_id, metadata_xml, metadata_url, attribute_mapping, created_at, updated_at, name_id_format) FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.saml_relay_states (id, sso_provider_id, request_id, for_email, redirect_to, created_at, updated_at, flow_state_id) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.schema_migrations (version) FROM stdin;
20171026211738
20171026211808
20171026211834
20180103212743
20180108183307
20180119214651
20180125194653
00
20210710035447
20210722035447
20210730183235
20210909172000
20210927181326
20211122151130
20211124214934
20211202183645
20220114185221
20220114185340
20220224000811
20220323170000
20220429102000
20220531120530
20220614074223
20220811173540
20221003041349
20221003041400
20221011041400
20221020193600
20221021073300
20221021082433
20221027105023
20221114143122
20221114143410
20221125140132
20221208132122
20221215195500
20221215195800
20221215195900
20230116124310
20230116124412
20230131181311
20230322519590
20230402418590
20230411005111
20230508135423
20230523124323
20230818113222
20230914180801
20231027141322
20231114161723
20231117164230
20240115144230
20240214120130
20240306115329
20240314092811
20240427152123
20240612123726
20240729123726
20240802193726
20240806073726
20241009103726
20250717082212
20250731150234
20250804100000
20250901200500
20250903112500
20250904133000
20250925093508
20251007112900
20251104100000
20251111201300
20251201000000
20260115000000
20260121000000
20260219120000
20260302000000
20260625000000
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sessions (id, user_id, created_at, updated_at, factor_id, aal, not_after, refreshed_at, user_agent, ip, tag, oauth_client_id, refresh_token_hmac_key, refresh_token_counter, scopes) FROM stdin;
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sso_domains (id, sso_provider_id, domain, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sso_providers (id, resource_id, created_at, updated_at, disabled) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
00000000-0000-0000-0000-000000000000	453a054f-5b39-4edc-86b0-1871d8b40b50	authenticated	authenticated	rizky@rt5.local	$2a$10$DpUml4aApOgQQxQYukyj2e4LHlUsWYXGZECvHcPBlfuaF70A1CBli	2026-08-07 07:16:56.90289+00	\N		\N		\N	\N	\N	\N	\N	{"provider": "email", "providers": ["email"]}	{"nik": "123", "nama": "rizky", "role": "Warga", "username": "rizky"}	\N	2026-08-07 07:16:56.90289+00	2026-08-07 07:16:56.90289+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	adf0872d-b064-41fa-98fd-036f65a83f4c	authenticated	authenticated	kodok@rt5.local	$2a$10$GRgcvLTvZFFCy0iknT.JFuniw.JqCxyFOKaZILdvgoGtY/LJsFS7.	2026-08-07 07:38:36.421799+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"provider": "email", "providers": ["email"]}	{"nik": "9999999999999999", "nama": "kodok", "role": "Warga", "username": "kodok"}	\N	2026-08-07 07:38:36.421799+00	2026-08-07 07:38:36.421799+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.webauthn_challenges (id, user_id, challenge_type, session_data, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.webauthn_credentials (id, user_id, credential_id, public_key, attestation_type, aaguid, sign_count, transports, backup_eligible, backed_up, friendly_name, created_at, updated_at, last_used_at) FROM stdin;
\.


--
-- Data for Name: Aset; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Aset" (id, nama_barang, kondisi, jumlah, status_barang, created_at) FROM stdin;
ASE-b46c5fd9cf075868	Kursi	\N	50	Kursi	2026-08-15 08:48:05.746675+00
\.


--
-- Data for Name: Aspirasi; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Aspirasi" (id, tanggal, isi_aspirasi, status, nama, created_at, verified_at) FROM stdin;
ASP-7c1e34d67fe3dc6a	15/08/2026 20:46 WIB	Oke	Belum di verifikasi	Rich Brian	2026-08-15 13:46:59.616975+00	\N
\.


--
-- Data for Name: Bansos; Type: TABLE DATA; Schema: public; Owner: postgres
--

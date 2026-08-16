
ALTER TABLE auth.oauth_clients OWNER TO supabase_auth_admin;

--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


ALTER TABLE auth.oauth_consents OWNER TO supabase_auth_admin;

--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


ALTER TABLE auth.one_time_tokens OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


ALTER TABLE auth.refresh_tokens OWNER TO supabase_auth_admin;

--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: supabase_auth_admin
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE auth.refresh_tokens_id_seq OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: supabase_auth_admin
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


ALTER TABLE auth.saml_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


ALTER TABLE auth.saml_relay_states OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


ALTER TABLE auth.schema_migrations OWNER TO supabase_auth_admin;

--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


ALTER TABLE auth.sessions OWNER TO supabase_auth_admin;

--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


ALTER TABLE auth.sso_domains OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


ALTER TABLE auth.sso_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


ALTER TABLE auth.users OWNER TO supabase_auth_admin;

--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: webauthn_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.webauthn_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    challenge_type text NOT NULL,
    session_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT webauthn_challenges_challenge_type_check CHECK ((challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text])))
);


ALTER TABLE auth.webauthn_challenges OWNER TO supabase_auth_admin;

--
-- Name: webauthn_credentials; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.webauthn_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    credential_id bytea NOT NULL,
    public_key bytea NOT NULL,
    attestation_type text DEFAULT ''::text NOT NULL,
    aaguid uuid,
    sign_count bigint DEFAULT 0 NOT NULL,
    transports jsonb DEFAULT '[]'::jsonb NOT NULL,
    backup_eligible boolean DEFAULT false NOT NULL,
    backed_up boolean DEFAULT false NOT NULL,
    friendly_name text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone
);


ALTER TABLE auth.webauthn_credentials OWNER TO supabase_auth_admin;

--
-- Name: Aset; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Aset" (
    id text NOT NULL,
    nama_barang text,
    kondisi text,
    jumlah numeric,
    status_barang text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public."Aset" OWNER TO postgres;

--
-- Name: Aspirasi; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Aspirasi" (
    id text NOT NULL,
    tanggal text,
    isi_aspirasi text,
    status text,
    nama text,
    created_at timestamp with time zone DEFAULT now(),
    verified_at timestamp with time zone
);


ALTER TABLE public."Aspirasi" OWNER TO postgres;

--
-- Name: Bansos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Bansos" (
    id text NOT NULL,
    nik text,
    nama text,
    no_kk text,
    jenis_bansos text,
    tanggal_mulai text,
    tanggal_selesai text,
    status text,
    keterangan text,
    diambil_pada text,
    diverifikasi_oleh text,
    created_at timestamp with time zone DEFAULT now(),
    nik_sha text,
    kk_sha text
);


ALTER TABLE public."Bansos" OWNER TO postgres;

--
-- Name: Iuran; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Iuran" (
    id text NOT NULL,
    nik text,
    nama text,
    no_kk text,
    bulan text,
    tahun numeric,
    nominal numeric,
    status text,
    tanggal_bayar text,
    diterima_oleh text,
    bukti_transfer text,
    created_at timestamp with time zone DEFAULT now(),
    verified_at timestamp with time zone,
    nik_sha text,
    kk_sha text
);


ALTER TABLE public."Iuran" OWNER TO postgres;

--
-- Name: Kelahiran; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Kelahiran" (
    id text NOT NULL,
    nama_bayi text,
    tanggal_lahir text,
    nama_ayah text,
    nama_ibu text,
    alamat text,
    rt numeric,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public."Kelahiran" OWNER TO postgres;

--
-- Name: Kematian; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Kematian" (
    id text NOT NULL,
    nama text,
    nik text,
    no_kk text,
    tanggal_meninggal text,
    rt numeric,
    alamat text,
    keterangan text,
    created_at timestamp with time zone DEFAULT now(),
    nik_sha text,
    kk_sha text
);


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

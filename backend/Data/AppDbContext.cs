using Microsoft.EntityFrameworkCore;
using backend.Models;
using backend.Models.Enums;

namespace backend.Data;

/// <summary>
/// EF Core database context for the Industrial Evidence Chain application.
/// Targets PostgreSQL via Npgsql provider.
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<EvidenceRecord> EvidenceRecords => Set<EvidenceRecord>();
    public DbSet<EvidenceMedia> EvidenceMedia => Set<EvidenceMedia>();
    public DbSet<BlockchainProof> BlockchainProofs => Set<BlockchainProof>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── Users ────────────────────────────────────────────────────────────
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(e => e.UserId);
            entity.Property(e => e.UserId)
                .HasColumnType("uuid")
                .HasColumnName("user_id")
                .HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.Username)
                .HasColumnName("username")
                .HasColumnType("text")
                .IsRequired();
            entity.Property(e => e.Email)
                .HasColumnName("email")
                .HasColumnType("text")
                .IsRequired();
            entity.Property(e => e.PasswordHash)
                .HasColumnName("password_hash")
                .HasColumnType("text")
                .IsRequired();
            entity.Property(e => e.FullName)
                .HasColumnName("full_name")
                .HasColumnType("text")
                .IsRequired();
            entity.Property(e => e.IsActive)
                .HasColumnName("is_active")
                .HasDefaultValue(true);
            entity.Property(e => e.CreatedAt)
                .HasColumnName("created_at")
                .HasColumnType("timestamp with time zone")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt)
                .HasColumnName("updated_at")
                .HasColumnType("timestamp with time zone");

            entity.HasIndex(e => e.Username).IsUnique().HasDatabaseName("ix_users_username");
            entity.HasIndex(e => e.Email).IsUnique().HasDatabaseName("ix_users_email");
        });

        // ── Roles ─────────────────────────────────────────────────────────────
        modelBuilder.Entity<Role>(entity =>
        {
            entity.ToTable("roles");
            entity.HasKey(e => e.RoleId);
            entity.Property(e => e.RoleId)
                .HasColumnType("uuid")
                .HasColumnName("role_id")
                .HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.Name)
                .HasColumnName("name")
                .HasColumnType("text")
                .IsRequired();
            entity.Property(e => e.Description)
                .HasColumnName("description")
                .HasColumnType("text");

            entity.HasIndex(e => e.Name).IsUnique().HasDatabaseName("ix_roles_name");
        });

        // ── UserRoles ─────────────────────────────────────────────────────────
        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.ToTable("user_roles");
            entity.HasKey(e => e.UserRoleId);
            entity.Property(e => e.UserRoleId)
                .HasColumnType("uuid")
                .HasColumnName("user_role_id")
                .HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.UserId)
                .HasColumnType("uuid")
                .HasColumnName("user_id");
            entity.Property(e => e.RoleId)
                .HasColumnType("uuid")
                .HasColumnName("role_id");
            entity.Property(e => e.AssignedAt)
                .HasColumnName("assigned_at")
                .HasColumnType("timestamp with time zone")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Unique: one user cannot hold the same role twice
            entity.HasIndex(e => new { e.UserId, e.RoleId })
                .IsUnique()
                .HasDatabaseName("ix_user_roles_user_role");

            entity.HasOne(e => e.User)
                .WithMany(u => u.UserRoles)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Role)
                .WithMany(r => r.UserRoles)
                .HasForeignKey(e => e.RoleId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Assets ────────────────────────────────────────────────────────────
        modelBuilder.Entity<Asset>(entity =>
        {
            entity.ToTable("assets");
            entity.HasKey(e => e.AssetId);
            entity.Property(e => e.AssetId)
                .HasColumnType("uuid")
                .HasColumnName("asset_id")
                .HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.Name)
                .HasColumnName("name")
                .HasColumnType("text")
                .IsRequired();
            entity.Property(e => e.Description)
                .HasColumnName("description")
                .HasColumnType("text");
            entity.Property(e => e.AssetCode)
                .HasColumnName("asset_code")
                .HasColumnType("text")
                .IsRequired();
            entity.Property(e => e.Category)
                .HasColumnName("category")
                .HasColumnType("text")
                .IsRequired();
            entity.Property(e => e.Location)
                .HasColumnName("location")
                .HasColumnType("text");
            entity.Property(e => e.Status)
                .HasColumnName("status")
                .HasColumnType("text")
                .HasConversion<string>()
                .IsRequired();
            entity.Property(e => e.Specifications)
                .HasColumnName("specifications")
                .HasColumnType("text")
                .HasDefaultValue("{}")
                .IsRequired();
            entity.Property(e => e.CreatedByUserId)
                .HasColumnType("uuid")
                .HasColumnName("created_by_user_id");
            entity.Property(e => e.AssignedToUserId)
                .HasColumnType("uuid")
                .HasColumnName("assigned_to_user_id");
            entity.Property(e => e.CreatedAt)
                .HasColumnName("created_at")
                .HasColumnType("timestamp with time zone")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt)
                .HasColumnName("updated_at")
                .HasColumnType("timestamp with time zone");

            entity.HasIndex(e => e.AssetCode).IsUnique().HasDatabaseName("ix_assets_asset_code");
            entity.HasIndex(e => e.Category).HasDatabaseName("ix_assets_category");
            entity.HasIndex(e => e.Status).HasDatabaseName("ix_assets_status");
            entity.HasIndex(e => e.AssignedToUserId).HasDatabaseName("ix_assets_assigned_to_user_id");

            entity.HasOne(e => e.CreatedBy)
                .WithMany(u => u.CreatedAssets)
                .HasForeignKey(e => e.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.AssignedTo)
                .WithMany(u => u.AssignedAssets)
                .HasForeignKey(e => e.AssignedToUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── EvidenceRecords ────────────────────────────────────────────────────
        modelBuilder.Entity<EvidenceRecord>(entity =>
        {
            entity.ToTable("evidence_records");
            entity.HasKey(e => e.EvidenceId);
            entity.Property(e => e.EvidenceId)
                .HasColumnType("uuid")
                .HasColumnName("evidence_id")
                .HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.AssetId)
                .HasColumnType("uuid")
                .HasColumnName("asset_id");
            entity.Property(e => e.UserId)
                .HasColumnType("uuid")
                .HasColumnName("user_id");
            entity.Property(e => e.ActivityType)
                .HasColumnName("activity_type")
                .HasColumnType("text")
                .HasConversion<string>()
                .IsRequired();
            entity.Property(e => e.Timestamp)
                .HasColumnName("timestamp")
                .HasColumnType("timestamp with time zone")
                .IsRequired();
            entity.Property(e => e.Latitude)
                .HasColumnName("latitude")
                .HasColumnType("numeric(10,7)");
            entity.Property(e => e.Longitude)
                .HasColumnName("longitude")
                .HasColumnType("numeric(10,7)");
            entity.Property(e => e.Description)
                .HasColumnName("description")
                .HasColumnType("text")
                .IsRequired();
            entity.Property(e => e.EvidenceHash)
                .HasColumnName("evidence_hash")
                .HasColumnType("text");
            entity.Property(e => e.AnchorStatus)
                .HasColumnName("anchor_status")
                .HasColumnType("text")
                .HasConversion<string>()
                .IsRequired();
            entity.Property(e => e.CreatedAt)
                .HasColumnName("created_at")
                .HasColumnType("timestamp with time zone")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.Property(e => e.AssignedManagerId)
                .HasColumnType("uuid")
                .HasColumnName("assigned_manager_id")
                .IsRequired(false);

            entity.HasIndex(e => e.AssetId).HasDatabaseName("ix_evidence_records_asset_id");
            entity.HasIndex(e => e.UserId).HasDatabaseName("ix_evidence_records_user_id");
            entity.HasIndex(e => e.AnchorStatus).HasDatabaseName("ix_evidence_records_anchor_status");
            entity.HasIndex(e => e.AssignedManagerId).HasDatabaseName("ix_evidence_records_assigned_manager_id");

            entity.HasOne(e => e.Asset)
                .WithMany(a => a.EvidenceRecords)
                .HasForeignKey(e => e.AssetId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.User)
                .WithMany(u => u.EvidenceRecords)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.AssignedManager)
                .WithMany(u => u.ManagedEvidenceRecords)
                .HasForeignKey(e => e.AssignedManagerId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ── EvidenceMedia ──────────────────────────────────────────────────────
        modelBuilder.Entity<EvidenceMedia>(entity =>
        {
            entity.ToTable("evidence_media");
            entity.HasKey(e => e.MediaId);
            entity.Property(e => e.MediaId)
                .HasColumnType("uuid")
                .HasColumnName("media_id")
                .HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.EvidenceId)
                .HasColumnType("uuid")
                .HasColumnName("evidence_id");
            entity.Property(e => e.FileName)
                .HasColumnName("file_name")
                .HasColumnType("text")
                .IsRequired();
            entity.Property(e => e.FileType)
                .HasColumnName("file_type")
                .HasColumnType("text")
                .HasConversion<string>()
                .IsRequired();
            entity.Property(e => e.StorageUrl)
                .HasColumnName("storage_url")
                .HasColumnType("text")
                .IsRequired();
            entity.Property(e => e.FileSizeBytes)
                .HasColumnName("file_size_bytes")
                .HasColumnType("bigint");
            entity.Property(e => e.FileHash)
                .HasColumnName("file_hash")
                .HasColumnType("text");
            entity.Property(e => e.UploadedAt)
                .HasColumnName("uploaded_at")
                .HasColumnType("timestamp with time zone")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasIndex(e => e.EvidenceId).HasDatabaseName("ix_evidence_media_evidence_id");

            entity.HasOne(e => e.EvidenceRecord)
                .WithMany(r => r.MediaFiles)
                .HasForeignKey(e => e.EvidenceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── BlockchainProofs ────────────────────────────────────────────────────
        modelBuilder.Entity<BlockchainProof>(entity =>
        {
            entity.ToTable("blockchain_proofs");
            entity.HasKey(e => e.ProofId);
            entity.Property(e => e.ProofId)
                .HasColumnType("uuid")
                .HasColumnName("proof_id")
                .HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.EvidenceId)
                .HasColumnType("uuid")
                .HasColumnName("evidence_id");
            entity.Property(e => e.AssetId)
                .HasColumnType("uuid")
                .HasColumnName("asset_id");
            entity.Property(e => e.EvidenceHash)
                .HasColumnName("evidence_hash")
                .HasColumnType("text")
                .IsRequired();
            entity.Property(e => e.TransactionId)
                .HasColumnName("transaction_id")
                .HasColumnType("text")
                .IsRequired();
            entity.Property(e => e.SignerIdentity)
                .HasColumnName("signer_identity")
                .HasColumnType("text");
            entity.Property(e => e.AnchoredAt)
                .HasColumnName("anchored_at")
                .HasColumnType("timestamp with time zone")
                .IsRequired();
            entity.Property(e => e.CreatedAt)
                .HasColumnName("created_at")
                .HasColumnType("timestamp with time zone")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // One evidence record → at most one blockchain proof
            entity.HasIndex(e => e.EvidenceId).IsUnique().HasDatabaseName("ix_blockchain_proofs_evidence_id");
            entity.HasIndex(e => e.TransactionId).HasDatabaseName("ix_blockchain_proofs_transaction_id");

            entity.HasOne(e => e.EvidenceRecord)
                .WithOne(r => r.BlockchainProof)
                .HasForeignKey<BlockchainProof>(e => e.EvidenceId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Asset)
                .WithMany(a => a.BlockchainProofs)
                .HasForeignKey(e => e.AssetId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── AuditLogs ──────────────────────────────────────────────────────────
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.ToTable("audit_logs");
            entity.HasKey(e => e.AuditLogId);
            entity.Property(e => e.AuditLogId)
                .HasColumnType("uuid")
                .HasColumnName("audit_log_id")
                .HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.UserId)
                .HasColumnType("uuid")
                .HasColumnName("user_id");
            entity.Property(e => e.Action)
                .HasColumnName("action")
                .HasColumnType("text")
                .IsRequired();
            entity.Property(e => e.EntityType)
                .HasColumnName("entity_type")
                .HasColumnType("text");
            entity.Property(e => e.EntityId)
                .HasColumnName("entity_id")
                .HasColumnType("text");
            entity.Property(e => e.Details)
                .HasColumnName("details")
                .HasColumnType("text");
            entity.Property(e => e.IpAddress)
                .HasColumnName("ip_address")
                .HasColumnType("text");
            entity.Property(e => e.CreatedAt)
                .HasColumnName("created_at")
                .HasColumnType("timestamp with time zone")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasIndex(e => e.UserId).HasDatabaseName("ix_audit_logs_user_id");
            entity.HasIndex(e => e.CreatedAt).HasDatabaseName("ix_audit_logs_created_at");
            entity.HasIndex(e => e.EntityType).HasDatabaseName("ix_audit_logs_entity_type");

            // Nullable FK — audit logs survive user deletion
            entity.HasOne(e => e.User)
                .WithMany(u => u.AuditLogs)
                .HasForeignKey(e => e.UserId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ── RefreshTokens ──────────────────────────────────────────────────────
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("refresh_tokens");
            entity.HasKey(e => e.TokenId);
            entity.Property(e => e.TokenId)
                .HasColumnType("uuid")
                .HasColumnName("token_id")
                .HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.UserId)
                .HasColumnType("uuid")
                .HasColumnName("user_id")
                .IsRequired();
            entity.Property(e => e.TokenHash)
                .HasColumnName("token_hash")
                .HasColumnType("text")
                .IsRequired();
            entity.Property(e => e.ExpiresAt)
                .HasColumnName("expires_at")
                .HasColumnType("timestamp with time zone")
                .IsRequired();
            entity.Property(e => e.CreatedAt)
                .HasColumnName("created_at")
                .HasColumnType("timestamp with time zone")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.RevokedAt)
                .HasColumnName("revoked_at")
                .HasColumnType("timestamp with time zone");
            entity.Property(e => e.ReplacedByTokenHash)
                .HasColumnName("replaced_by_token_hash")
                .HasColumnType("text");

            entity.Ignore(e => e.IsActive);

            entity.HasIndex(e => e.TokenHash).IsUnique().HasDatabaseName("ix_refresh_tokens_token_hash");
            entity.HasIndex(e => e.UserId).HasDatabaseName("ix_refresh_tokens_user_id");

            entity.HasOne(e => e.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}

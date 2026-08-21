locals { name = "${var.service_name}-${var.environment}" }

resource "aws_s3_bucket" "private_assets" { bucket_prefix = "${local.name}-private-" }
resource "aws_s3_bucket_public_access_block" "private_assets" {
  bucket = aws_s3_bucket.private_assets.id
  block_public_acls = true
  block_public_policy = true
  ignore_public_acls = true
  restrict_public_buckets = true
}
resource "aws_s3_bucket_server_side_encryption_configuration" "private_assets" {
  bucket = aws_s3_bucket.private_assets.id
  rule { apply_server_side_encryption_by_default { sse_algorithm = "AES256" } }
}

resource "aws_ecr_repository" "web" { name = "${local.name}-web"; image_scanning_configuration { scan_on_push = true } }
resource "aws_ecr_repository" "api" { name = "${local.name}-api"; image_scanning_configuration { scan_on_push = true } }
resource "aws_ecr_repository" "worker" { name = "${local.name}-worker"; image_scanning_configuration { scan_on_push = true } }

# Networking, ECS services, ALB/CloudFront/WAF, RDS Multi-AZ, ElastiCache,
# Secrets Manager and alarms are intentionally composed in environment modules
# after the client AWS account, domain, CIDRs and retention policy are confirmed.

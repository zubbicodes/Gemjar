variable "aws_region" { type = string; default = "eu-west-2" }
variable "environment" { type = string; validation { condition = contains(["staging", "production"], var.environment); error_message = "Environment must be staging or production." } }
variable "service_name" { type = string; default = "gemjar" }
variable "database_name" { type = string; default = "gemjar" }
variable "database_username" { type = string; sensitive = true }

packer {
  required_plugins {
    amazon = {
      version = ">=1.0.0, <2.0.0"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

variable "aws_region" {
  type    = string
  default = ""
}
variable "db_user" {
  type    = string
  default = ""
}
variable "db_pass" {
  type    = string
  default = ""
}
variable "db_name" {
  type    = string
  default = ""
}
variable "ami_description" {
  type    = string
  default = ""
}
variable "ami_polling_delay" {
  type    = number
  default = 120
}
variable "ami_polling_max_attempts" {
  type    = number
  default = 50
}
variable "ami_instance_type" {
  type    = string
  default = ""
}
variable "ami_source_ami" {
  type    = string
  default = ""
}
variable "ami_ssh_username" {
  type    = string
  default = ""
}
variable "ami_subnet_id" {
  type    = string
  default = ""
}
variable "ami_launch_device_name" {
  type    = string
  default = ""
}
variable "ami_launch_volume_size" {
  type    = number
  default = 8
}
variable "ami_launch_volume_type" {
  type    = string
  default = ""
}
variable "build_ami_name" {
  type    = string
  default = ""
}
variable "ami_user_1" {
  type    = string
  default = ""
}
variable "ami_user_2" {
  type    = string
  default = ""
}


source "amazon-ebs" "ubuntu" {
  region          = "${var.aws_region}"
  ami_name        = "csye6225_app_${formatdate("YYYY_MM_DD-hhmmss", timestamp())}"
  ami_description = "${var.ami_description}"
  ami_users       = ["${var.ami_user_1}", "${var.ami_user_2}"]

  ami_regions = [
    "${var.aws_region}",
  ]
  aws_polling {
    delay_seconds = "${var.ami_polling_delay}"
    max_attempts  = "${var.ami_polling_max_attempts}"
  }

  instance_type = "${var.ami_instance_type}" #Downsize during assignment 5 onwards
  source_ami    = "${var.ami_source_ami}"
  ssh_username  = "${var.ami_ssh_username}"
  subnet_id     = "${var.ami_subnet_id}"

  #Storage attached to VM 

  launch_block_device_mappings {
    delete_on_termination = true
    device_name           = "${var.ami_launch_device_name}"
    volume_size           = "${var.ami_launch_volume_size}"
    volume_type           = "${var.ami_launch_volume_type}"
  }


}

build {
  name = "${var.build_ami_name}"
  sources = [
    "source.amazon-ebs.ubuntu"
  ]

  provisioner "shell" {
    environment_vars = [
      "DEBIAN_FRONTEND=noninteractive",
      "CHECKPOINT_DISABLE=1" #disables packer's usage and data statistics
    ]
    script = "scripts/os_upgrade.sh"

  }

  provisioner "shell" {
    script = "scripts/app_dir_setup.sh"
  }

  provisioner "file" { #For assignment 5 onwards
    source      = ".env"
    destination = "/tmp/.env"
  }

  provisioner "file" {
    source      = "webapp.zip"
    destination = "/tmp/"
  }

  provisioner "file" {
    source      = "csye6225.service"
    destination = "/tmp/"
  }

  provisioner "shell" {
    environment_vars = [
      "PSQL_USER=${var.db_user}",
      "PSQL_DBNAME=${var.db_name}",
      "PSQL_PASS=${var.db_pass}"
    ]
    scripts = [
      "scripts/setup.sh",
      "scripts/systemd.sh"
    ]
  }

}
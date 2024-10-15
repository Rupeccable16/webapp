packer {
  required_plugins {
    amazon = {
      version = ">=1.0.0, <2.0.0"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

source "amazon-ebs" "ubuntu" {
  region          = "us-east-1"
  ami_name        = "csye6225_app_${formatdate("YYYY_MM_DD", timestamp())}"
  ami_description = "AMI for Assignment 04"

  ami_regions = [
    "us-east-1",
  ]
  aws_polling {
    delay_seconds = 120
    max_attempts  = 50
  }

  instance_type = "t2.small" #Downsize during assignment 5 onwards
  source_ami    = "ami-0866a3c8686eaeeba"
  ssh_username  = "ubuntu"
  subnet_id     = "subnet-0e11e5baa90d9d2b0"

  #Storage attached to VM

  launch_block_device_mappings {
    delete_on_termination = true
    device_name           = "/dev/sda1"
    volume_size           = 8
    volume_type           = "gp2"
  }


}

build {
  name = "learn-packer"
  sources = [
    "source.amazon-ebs.ubuntu"
  ]

  provisioner "shell" {
    environment_vars = [
      "DEBIAN_FRONTEND=noninteractive",
      "CHECKPOINT_DISABLE=1" #disables packer's usage and data statistics
    ]
    scripts = [
      "os_upgrade.sh",
    ]
  }

  provisioner "shell" {
    script = "app_dir_setup.sh",
  }

  // provisioner "file"{ #For assignment 5 onwards
  //   source = "app.properties"
  //   destination = "/tmp/app.properties"
  // }

  provisioner "file" {
    source = "webapp.zip"
    destination = "/tmp/"
  }

  provisioner "shell" {
    environment_vars = [
      "db_user=${var.db_user}",
      "db_name=${var.db_name}",
      "db_pass=${var.db_pass}"
    ]
    scripts = [
      "setup.sh",
      "systemd.sh"
    ]
  }

}
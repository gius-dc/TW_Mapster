#!/bin/bash

# Function to identify the Linux distribution and suggest an installation command
detect_linux_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        case $ID in
            ubuntu|debian)
                echo "It looks like you are using Ubuntu/Debian. You can install Python and pip with: sudo apt install python3 python3-pip"
                ;;
            fedora|centos|rhel)
                echo "It looks like you are using Fedora/CentOS/RHEL. You can install Python and pip with: sudo dnf install python3 python3-pip"
                ;;
            arch|manjaro)
                echo "It looks like you are using Arch/Manjaro. You can install Python and pip with: sudo pacman -S python python-pip"
                ;;
            *)
                echo "Please install Python and pip using your distribution's package manager."
                ;;
        esac
    else
        echo "Please ensure you have Python and pip installed on your system."
    fi
}

# Print an initial message
echo "### Welcome to the setup script! ###"
echo "This script will configure the environment and install Python dependencies to ensure the project functions properly."
echo "In order for this script to function correctly, Python and pip must be installed on your system."
# Detect the Linux distribution and suggest the installation command
INSTALL_CMD=$(detect_linux_distro)
echo "$INSTALL_CMD"

# Ask the user to confirm that Python and pip are installed
echo
read -p "Have you installed Python and pip and want to proceed with installing dependencies? (y/n) " response
if [[ ! $response =~ ^[Yy]$ ]]; then
    echo "Installation aborted. Please install Python and pip, and then rerun this script."
    exit 1
fi

# Proceed with the dependency installation
echo "Creating a virtual environment and installing dependencies..."

# Create a virtual environment specifically for Mapster
python3 -m venv mapster_env

# Activate the Mapster virtual environment
source mapster_env/bin/activate

# Install dependencies
pip install -r requirements.txt

echo "Installation completed. Now you can start the project with the run.sh script."
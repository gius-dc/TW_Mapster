
<p align="center">
  <img src="https://github.com/gius-dc/techweb-project/blob/main/static/icons/transp-icon-256x256.png?raw=true" alt="Mapster Logo" width="256" height="256"/>
  <br>
  <h1 align="center">Mapster</h1>
</p>

Mapster is a progressive web app (PWA) and map-sharing platform that allows users to create personalized itineraries and share them. This application provides an interactive user experience, enabling users to create, share, and explore custom maps.

## Prerequisites

Before you start, ensure you have Python and pip installed on your system. Here are the installation instructions for different operating systems.

### Installing Python and pip

#### Linux (Ubuntu/Debian)
Python 3 is usually pre-installed on recent versions of Ubuntu (20.04 and later). To install Python 3 and pip, run the following command in a terminal:
```bash
sudo apt install python3 python3-pip
```

#### Linux (Fedora/CentOS/RHEL)
Python is generally pre-installed on Fedora. For CentOS/RHEL, you may need to install Python 3 manually. To install Python 3 and pip on Fedora/CentOS/RHEL, execute this command in a terminal:
```bash
sudo dnf install python3 python3-pip
```

#### Linux (Arch/Manjaro)
Python, typically the latest version, is pre-installed on Arch and Manjaro. To install pip, run the following command in a terminal:
```bash
sudo pacman -S python-pip
```

#### macOS
Python is usually pre-installed on macOS. To install pip, you can use the `ensurepip` module, which is included in Python 3.4 and later. In a new Terminal window, execute the following command to install pip:

```bash
python3 -m ensurepip
```

This will install pip using Python’s bundled `ensurepip`.

#### Windows
Download and install Python from the [official website](https://www.python.org/downloads/windows/). Ensure you select the option to 'Add Python to PATH'. pip is included with Python.

## Configuration

### Flask Server Configuration

The `config.py` file contains important settings for the Flask server, including:

- **MongoDB Connection URI**: Set your MongoDB connection URI for the database.
- **Secret Key**: Define a secret key for application security.
- **Google OAuth Credentials**: For the Google login functionality in the application to work, you need to provide these credentials. To obtain them, visit the [Google API Console](https://console.developers.google.com/). Create your project, configure the OAuth consent screen, and generate the necessary credentials.
- **Caching Configuration**: Toggle to enhance performance by caching content. Useful for optimizing load times in production, but can be disabled during development for real-time content updates.

Ensure to customize these settings as needed before proceeding with the server launch.

## Installation and Startup

### Automated Setup and Launch (Linux/macOS)

Use the provided scripts for a quick setup and launch on Linux and potentially macOS. These scripts are written in bash, which is commonly supported on both Linux and macOS systems. However, please note that while these scripts are primarily designed for Linux environments, they have not been extensively tested on macOS. Therefore, their compatibility with macOS is not fully assured. If you encounter any issues with these scripts, consider trying the [manual setup](#manual-setup-and-launch-all-operating-systems).

In a terminal, navigate to the project's root directory. If you haven't already, make the scripts executable by running `chmod +x ./setup.sh` and `chmod +x ./run.sh`. Then, execute the setup script:

```bash
./setup.sh
```

Before starting the project, configure your application as mentioned in the [Configuration](#configuration) section.

After configuring, launch the application:
```bash
./run.sh
```

### Manual Setup and Launch (All Operating Systems)

For systems where the automated scripts are not compatible (like Windows), or if you prefer manual setup:

1. [Install Python and pip.](#installing-python-and-pip)
2. (Optional) To isolate the project's dependencies, create and activate a virtual environment in the project's root directory:
   - **For Windows**:
     ```bash
     python -m venv mapster_env
     .\\mapster_env\\Scripts\\activate
     ```
   - **For Linux/macOS**:
     ```bash
     python3 -m venv mapster_env
     source mapster_env/bin/activate
     ```
3. In the project's root directory, install dependencies using pip:
   ```bash
   pip install -r requirements.txt
   ```
4. [Configure the Flask application.](#configuration)
5. In the project's root directory, set Flask environment variables and run the app:
   ```bash
   # For Windows
   set FLASK_APP=mapster_app.py
   set FLASK_ENV=debug
   flask run -h 0.0.0.0 -p 5000
   # For Linux/macOS
   export FLASK_APP=mapster_app.py
   export FLASK_ENV=debug
   flask run -h 0.0.0.0 -p 5000
   ```

This command starts the Flask application, making it accessible from any IP address within the same network (**0.0.0.0**) on port **5000**.

### Accessing the Application

Once the application is running, you can access it through a web browser:

- On the host machine: Navigate to `http://127.0.0.1:5000`.
- On any other device in the same network: Use `http://[local-IP-address-of-host-PC]:5000`, where `[local-IP-address-of-host-PC]` is the actual local IP address of the computer hosting the server.

## License

This project is released under the [Apache License 2.0](https://raw.githubusercontent.com/gius-dc/TW_Mapster/main/LICENSE).
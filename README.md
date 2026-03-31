# canton-developer-sandbox

One-click Canton developer sandbox with instant testnet faucet for new builders.

## Overview

This project provides a Docker Compose setup for a complete Canton network stack, along with a hosted faucet for obtaining testnet CC (Canton Coins). It significantly reduces developer onboarding time, enabling you to start building on Canton in minutes.

## Features

*   **One-Click Sandbox:**  Spins up a full Canton network using Docker Compose in under 5 minutes.
*   **Instant Testnet Faucet:** Provides immediate access to testnet CC without application or sponsorship.
*   **Simplified Onboarding:**  Reduces developer onboarding from days to minutes.
*   **Complete Canton Stack:** Includes all necessary Canton components for development and testing.

## Quickstart (5-Minute Setup)

1.  **Install Docker and Docker Compose:**  Make sure you have Docker and Docker Compose installed on your system.  Refer to the official Docker documentation for installation instructions: [https://docs.docker.com/get-docker/](https://docs.docker.com/get-docker/)

2.  **Clone the Repository:**

    ```bash
    git clone <repository_url>
    cd canton-developer-sandbox
    ```
    (Replace `<repository_url>` with the actual repository URL)

3.  **Start the Canton Network:**

    ```bash
    docker-compose up -d
    ```

    This command starts all Canton components in detached mode.  It will take a few minutes for all services to initialize.

4.  **Verify Network Status:**

    You can check the status of the Canton network using the following command:

    ```bash
    docker-compose ps
    ```

    Ensure that all services are running and healthy.

5.  **Access the Faucet:**

    Once the network is up and running, access the hosted faucet at `<faucet_url>`.  This URL will be provided separately, likely in the repository documentation or a project announcement.  Use the faucet to obtain testnet CC.

6.  **Configure Your Daml Project:**

    Configure your Daml project to connect to the Canton network running in the Docker Compose environment. The necessary connection details (e.g., hostnames, ports, participant IDs) will be provided in the `docker-compose.yml` file or in accompanying documentation.

7.  **Start Building!**

    You are now ready to start building and testing your Daml smart contracts on the Canton network.  Refer to the official Daml documentation for guidance on writing and deploying Daml code: [https://docs.daml.com/](https://docs.daml.com/)

## Faucet Usage

1.  **Retrieve Participant ID:** Obtain the participant ID of your Canton participant. This is required to receive testnet CC. You can find this ID in the Canton configuration files or through the Canton API.

2.  **Enter Participant ID:**  Enter your participant ID in the faucet web interface.

3.  **Request Funds:**  Click the "Request Funds" button.

4.  **Confirm Transaction:** The faucet will initiate a transfer of testnet CC to your participant.  This process may take a few seconds.

5.  **Verify Balance:**  Use the Canton API or a Canton-compatible wallet to verify that your participant has received the testnet CC.

## Configuration

The Canton network configuration is defined in the `docker-compose.yml` file.  You can customize the network settings by modifying this file.  Refer to the Docker Compose documentation for more information: [https://docs.docker.com/compose/](https://docs.docker.com/compose/)

## Troubleshooting

*   **Network Startup Issues:**  If you encounter issues starting the Canton network, check the Docker logs for error messages.  Use the `docker-compose logs` command to view the logs for individual services.
*   **Faucet Issues:**  If you are unable to access the faucet or request funds, ensure that the Canton network is running correctly and that your participant ID is valid.
*   **Connectivity Issues:**  If you are unable to connect to the Canton network from your Daml project, verify that the connection details are configured correctly and that the Canton services are accessible from your development environment.

## Contributing

Contributions to this project are welcome.  Please submit pull requests with your proposed changes.

## License

This project is licensed under the [License Name] License.
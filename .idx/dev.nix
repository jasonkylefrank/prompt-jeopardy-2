{ pkgs, ... }: {
  # Use the unstable channel for a wider selection of packages
  channel = "unstable";

  # The Nix packages available in your workspace
  packages = [
    pkgs.nodejs_20
    pkgs.pnpm
  ];

  # VS Code extensions for your workspace
  idx = {
    extensions = [
      "dbaeumer.vscode-eslint"
      "tailwindcss.vscode-intellisense" # For Tailwind CSS autocompletion and linting
    ];

    workspace = {
      # Runs when a workspace is first created
      onCreate = {
        "pnpm-install" = "pnpm install";
      };
    };

    previews = {
      enable = true;
      previews = {
        web = {
          # Pass the port argument directly to the dev script
          command = ["pnpm" "run" "dev" "--port" "$PORT"];
          manager = "web";
        };
      };
    };
  };
}

# Cross-platform one-click startup launcher

## Goal

Make a shell launcher the canonical Polaris startup path while keeping a reliable one-click entry point on Windows.

## Design

- Add `Start Polaris.sh` as the canonical launcher. It is committed with the executable Git file mode, detects a prepared virtual environment at either `backend/.venv/bin/python` (macOS/Linux) or `backend/.venv/Scripts/python.exe` (Windows Git Bash), then uses that interpreter to invoke `scripts/launch.py`.
- Keep `Start Polaris.cmd` as a deliberately thin Windows Explorer bridge. It searches the standard Git for Windows locations `%ProgramFiles%\Git\bin\bash.exe` and `%ProgramFiles(x86)%\Git\bin\bash.exe`, then invokes `Start Polaris.sh` with every supplied argument. Git Bash is a documented prerequisite for this bridge; a missing installation produces an actionable message and leaves the console open.
- Retain `Start Polaris.command` as the macOS Finder bridge. It invokes `Start Polaris.sh` and leaves Terminal open on an error. Thus macOS and Linux share the `.sh` source of truth while macOS retains Finder double-click support.
- Keep `scripts/launch.py` as the only process supervisor and Node resolver. It owns port checks, service startup, health checks, browser opening, child-process shutdown, and exit status. No wrapper starts services, installs dependencies, or detaches the supervisor.
- The shell launcher forwards all arguments without string concatenation or shell evaluation, including quoted values with spaces and `--no-browser`, and runs the supervisor in the foreground so Ctrl+C stops only the processes it started. It reports missing virtual environment and frontend dependencies without changing the machine.
- Update the README to direct macOS/Linux terminal users to `Start Polaris.sh`, Windows users to double-click `Start Polaris.cmd`, and macOS Finder users to `Start Polaris.command`.

## Failure handling

The shell launcher exits with an actionable error when the virtual environment is missing. The shared Python supervisor continues to report missing Node or frontend dependencies, reject occupied ports, reuse only healthy Polaris services, and terminate only the processes it started. The Windows and macOS bridges preserve the terminal window for errors, forward exit codes, and do not detach the running supervisor.

## Verification

- Confirm `bash -n "Start Polaris.sh"` and `bash -n "Start Polaris.command"` pass.
- Compile `scripts/launch.py` with the prepared virtual-environment Python.
- Confirm `Start Polaris.sh --no-browser` forwards the argument to the supervisor. As a bounded smoke test, wait for the API and website URLs, send Ctrl+C, and confirm both child services exit. Do not leave the launcher running after verification.
- Confirm a quoted argument is forwarded unchanged by each bridge; `--no-browser` is the supported functional argument today.
- Inspect the Windows bridge's Git Bash paths and argument forwarding; inspect the macOS bridge's delegation and error pause.
- Confirm README links describe the one-click path for Windows and macOS plus terminal use on macOS/Linux.

## Scope boundaries and success criteria

Success is a single foreground command path whose supervisor launches the API and frontend, waits for healthy responses, optionally opens the browser, and stops child processes on Ctrl+C. macOS/Linux documentation uses `./Start\ Polaris.sh`; a checkout that loses executable file modes can be repaired with `chmod +x "Start Polaris.sh" "Start Polaris.command"`. No launcher performs dependency installation, modifies data, changes the API, changes the dashboard, or restores legacy durability scores.

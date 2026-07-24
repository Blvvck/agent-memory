if (process.env.npm_config_global === "true") {
  process.stdout.write("\nAgent Memory is ready. Run `agent-memory init` inside a project to create shared memory, add that project's context and activity files, and choose which harnesses to connect. Setup keeps files you already have.\n\n");
} else {
  process.stdout.write("\nAgent Memory is ready. From the project you want to equip, run `npx @blvvck/agent-memory init`.\nIt creates shared memory, offers project context and activity files, then guides you through optional team modules and harness hooks. You choose what to connect, and existing files are kept.\n\n");
}

#!/usr/bin/env node

import { createProgram } from "@/cli/program";

const program = await createProgram();
await program.parseAsync(process.argv);

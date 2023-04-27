#!/usr/bin/env node
import process from "node:process";
import { spinner, note, text, intro, isCancel, confirm, select } from "@clack/prompts";
import fs from "node:fs";
import path from "node:path";
import colors from "picocolors";
import { generateProject } from "./generateProject.ts";
import packageJson from "../package.json" assert { type: "json" };
import type { TemplateId } from "./templates.ts";

let outputDirectory = process.argv[2];

intro(colors.gray(`${packageJson.name} - v${packageJson.version}`));

// Ask for output directory
if (!outputDirectory) {
    const directory = await text({
        message: "Where should we create your project?",
        placeholder: "  (hit Enter to use current directory)"
    });

    if (isCancel(directory)) { process.exit(1); }

    outputDirectory = directory ?? ".";
}

// Check if the directory is empty
if (fs.existsSync(outputDirectory)) {
    if (fs.readdirSync(outputDirectory).length > 0) {
        const force = await confirm({
            message: "The directory is not empty. Do you wish to continue?",
            initialValue: false
        });

        // bail if `force` is `false` or the user cancelled with Ctrl-C
        if (force !== true) {
            process.exit(1);
        }
    }
}

const templateId = await select({
    message: "What would you like to generate?",
    initialValue: "host-application" as TemplateId,
    options: [
        {
            value: "host-application",
            label: "Host application"
        },
        {
            value: "remote-module",
            label: "Remote module"
        },
        {
            value: "static-module",
            label: "Static module"
        }
    ]
});

if (isCancel(templateId)) { process.exit(1); }

let packageScope: string | undefined;
let hostScope: string | undefined;

// Ask for other arguments
if (templateId === "host-application") {
    const textValue = await text({
        message: "What should be the package scope?",
        placeholder: "ex: @my-app",
        validate: value => {
            if (value === "" || value === undefined) {
                return "You must enter a scope";
            }
        }
    });

    if (isCancel(textValue)) { process.exit(1); }

    packageScope = textValue;
} else {
    const textValue = await text({
        message: "What is the host application scope?",
        placeholder: "ex: @my-app",
        validate: value => {
            if (value === "" || value === undefined) {
                return "You must enter a scope";
            }
        }
    });

    if (isCancel(textValue)) { process.exit(1); }

    hostScope = textValue;
}

// Call generateProject
const loader = spinner();
loader.start("Generating your project...");

const status = await generateProject(
    templateId,
    outputDirectory,
    {
        hostScope,
        packageScope
    }
);

if (status === 0) {
    loader.stop(colors.green("Your project is ready!"));

    let stepNumber = 1;
    const nextStepsInstructions = [];

    const relative = path.relative(process.cwd(), outputDirectory);
    if (relative !== "") {
        nextStepsInstructions.push(`  ${stepNumber++}: ${colors.cyan(`cd ${relative}`)}`);
    }
    nextStepsInstructions.push(`  ${stepNumber++}: ${colors.cyan("pnpm install")}`);

    note(
        nextStepsInstructions.join("\n"),
        "Next steps:"
    );
} else {
    loader.stop(colors.red("Something went wrong"));
}

process.exitCode = status;
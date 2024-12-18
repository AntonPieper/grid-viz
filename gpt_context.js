import fs from "node:fs/promises";

/** @type {string[]} */
const args = process.argv.slice(2);
for (const arg of args) {
    try {
        const contents = await fs.readFile(arg, { encoding: "utf8" });
        const extension = arg.split(".").at(-1);
        console.log(`**${arg}**:`)
        console.log("```" + extension);
        console.log(contents);
        console.log("```\n");
    } catch (e) {
    }
}
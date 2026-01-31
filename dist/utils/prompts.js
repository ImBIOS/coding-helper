import inquirer from "inquirer";
export async function confirm(message) {
    const { result } = await inquirer.prompt([
        {
            type: "confirm",
            name: "result",
            message,
            default: true,
        },
    ]);
    return result;
}
export async function input(message, defaultValue = "") {
    const { result } = await inquirer.prompt([
        {
            type: "input",
            name: "result",
            message,
            default: defaultValue,
        },
    ]);
    return result;
}
export async function password(message) {
    const { result } = await inquirer.prompt([
        {
            type: "password",
            name: "result",
            message,
        },
    ]);
    return result;
}
export async function select(message, choices, defaultIndex = 0) {
    const { result } = await inquirer.prompt([
        {
            type: "list",
            name: "result",
            message,
            choices: choices.map((c) => ({ name: c, value: c })),
            default: choices[defaultIndex],
        },
    ]);
    return result;
}
export async function checkbox(message, choices) {
    const { result } = await inquirer.prompt([
        {
            type: "checkbox",
            name: "result",
            message,
            choices: choices.map((c) => ({ name: c, value: c })),
        },
    ]);
    return result;
}
export async function providerSelection() {
    return select("Select API provider:", ["zai", "minimax"], 0);
}
export async function modelSelection(models) {
    return select("Select model:", models, 0);
}

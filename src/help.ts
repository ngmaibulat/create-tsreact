import chalk from 'chalk';

export function usage()
{
    console.log("\n");
    console.log(chalk.redBright("Please provide appname\n"))
    console.log(chalk.yellowBright("Usage:"));
    console.log(chalk.yellowBright("\tnpm create tsreact <appname>"));
    console.log(chalk.yellowBright("\tnpm init tsreact   <appname>"));
    console.log(chalk.yellowBright("\tnpx create-tsreact <appname>"));
    console.log("\n");
}

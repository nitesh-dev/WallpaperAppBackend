export async function delay(seconds: number) {
    for (let i = 1; i <= seconds; i++) {
        console.log(seconds - i);
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return
}
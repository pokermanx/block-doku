export class Utils {

    static randomString(len: number, charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string {
        return [...Array(len)].map(() => charSet.charAt(Math.floor(Math.random() * charSet.length))).toString().replace(/,/g, '');
    }

    static getRandomArbitrary(min: number, max: number): number {
        return Math.random() * (max - min) + min;
    }

}
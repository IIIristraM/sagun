export declare const DELAY = 20;
export type UserDetails = {
    cardLastDigits: string;
};
export declare class TestAPI {
    private _delay;
    constructor({ delay }: { delay: number });
    getUser: jest.Mock<
        Promise<{
            login: string;
        }>,
        [id: string],
        any
    >;
    getUserDetails: jest.Mock<Promise<UserDetails>, [login: string], any>;
    getList: jest.Mock<
        Promise<{
            items: number[];
        }>,
        [],
        any
    >;
}
export declare const api: TestAPI;

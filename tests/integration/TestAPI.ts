import { wait } from '_test/utils';

export const DELAY = 20;

export type UserDetails = {
    cardLastDigits: string;
};

export class TestAPI {
    private _delay: number;

    constructor({ delay }: { delay: number }) {
        this._delay = delay;
    }

    getUser = jest.fn(async (id: string) => {
        await wait(this._delay);
        return {
            login: 'iiiristram',
        };
    });

    getUserDetails = jest.fn(
        async (login: string): Promise<UserDetails> => {
            await wait(this._delay);
            return {
                cardLastDigits: '**00',
            };
        }
    );

    getList = jest.fn(async () => {
        await wait(this._delay);
        return {
            items: [1, 2, 3, 4, 5],
        };
    });
}

export const api = new TestAPI({ delay: DELAY });

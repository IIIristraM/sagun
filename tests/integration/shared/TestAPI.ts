import { vi } from 'vitest'

import { wait } from './utils';

export const DELAY = 20;

export type UserDetailsDto = {
    cardLastDigits: string;
};

export class TestAPI {
    private _delay: number;

    constructor({ delay }: { delay: number }) {
        this._delay = delay;
    }

    getUser = vi.fn(async (id: string) => {
        await wait(this._delay);
        return {
            login: 'iiiristram',
        };
    });

    getUserDetails = vi.fn(async (login: string): Promise<UserDetailsDto> => {
        await wait(this._delay);
        return {
            cardLastDigits: '**00',
        };
    });

    getList = vi.fn(async () => {
        await wait(this._delay);
        return {
            items: [1, 2, 3, 4, 5],
        };
    });
}

export const api = new TestAPI({ delay: DELAY });

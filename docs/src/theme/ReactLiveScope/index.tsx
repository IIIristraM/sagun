import React from 'react';

import * as effects from 'typed-redux-saga';

// Use compiled version from lib/ (src/ has decorators that require special babel config)
import * as sagun from '../../../../lib';

// @ts-ignore
import { Dependency, inject, DependencyKey } from '../../../../lib';

const { call, delay } = effects;

const user = {login: "John Doe"};
function * fetchUser() {
    return yield* call(() => {
        return new Promise(resolve => {
            setTimeout(() => resolve(user), 3000);
        })
    })
}

const orders = [
    {id: 1, description: "Order 1"},
    {id: 2, description: "Order 2"},
    {id: 3, description: "Order 3"},
]

function * fetchOrders() {
    return yield* call(() => {
        return new Promise(resolve => {
            setTimeout(() => resolve(orders), 500);
        })
    })
}

function * addOrder(order) {
    yield* delay(100);
    orders.push(order);
    bonuses.count += Math.round(Math.random() * 100);
}

function * addOrderV2(order) {
    yield* delay(100);
    bonuses.count += Math.round(Math.random() * 100);
}

function getNewId() {
    return Math.round(Math.random() * 1000);
}

const APP_CONTEXT_KEY = 'APP_CONTEXT' as DependencyKey<AppContext>;

type AppContext = {
    env: string;
}

const appContext = {
    env: "testing"
}

class API extends Dependency {
    #host: string;

    toString() {
        return 'API';
    }

    constructor(
        @inject(APP_CONTEXT_KEY) context: AppContext
    ) {
        super();
        this.#host = context?.env === "testing" ? "..." : "..."
    }
    
    fetchUser = fetchUser;
    fetchOrders = fetchOrders;
    addOrder = addOrder;
    addOrderV2 = addOrderV2;
    fetchBonuses = fetchBonuses;
}

function Order({id, description}) {
    return (
        <div key={id} style={{display: 'flex', gap: '10px'}}>
            <div>{id}</div>
            <div>{description}</div>
        </div>
    );
}

const bonuses = {
    count: 100,
}

function * fetchBonuses() {
    return yield* call(() => {
        return new Promise(resolve => {
            setTimeout(() => resolve(bonuses), 500);
        })
    })
}

// Add react-live imports you need here
const ReactLiveScope: Record<string, unknown> = {
  React,
  ...sagun,
  ...effects,
  ...React,
  fetchUser,
  fetchOrders,
  addOrder,
  addOrderV2,
  Order,
  fetchBonuses,
  getNewId,
  API,
  APP_CONTEXT_KEY,
  appContext
};

export default ReactLiveScope;

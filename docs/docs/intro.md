# Introduction

**Sagun** is a framework for developing [React](https://react.dev/) applications that works on top of familiar libraries like [redux](https://redux.js.org/) and [redux-saga](https://redux-saga.js.org/). It eliminates all the boilerplate and makes it easy to extend and test code by applying time-proven design patterns such as [MVC](https://en.wikipedia.org/wiki/Model-View-Controller) and [DI](https://en.wikipedia.org/wiki/Dependency_injection).

## What the Framework is Designed For

The framework is designed for complex applications rich in business logic with large domain areas. The framework itself emerged during the development of an application consisting of hundreds of pages, over a million lines of code, with hundreds of entities in its domain and thousands of operations on them.

For landing pages or small applications, this framework will likely be overkill.

## Why We Needed to Create a Framework

- The React ecosystem is mainly a set of libraries that individually solve their own problems, but there are no clear patterns for building good architecture from them.
- Libraries often push developers toward simplifications (e.g., writing everything with React hooks), which is good for quick prototyping but negatively affects application quality since boundaries and contracts between the presentation layer, application logic, domain logic, etc. become blurred or disappear entirely. Proper abstractions and contracts are the foundation of good architecture.
- Another extremely useful pattern — Dependency Injection — is only represented in the React ecosystem through React contexts, i.e., it exists only at the presentation level, when it's most needed when writing application logic and domain logic. This again encourages developers to write code that mixes everything together.
- Speaking of Redux, its code is full of boilerplate, and even later solutions like `redux-toolkit` provide an API that is somewhat overloaded on one hand and not very flexible on the other.

Meanwhile, in the generation of frameworks before React, such as KnockoutJS, BackboneJS, AngularJS, etc., despite their other problems, design patterns were widely applied, and on average applications were better structured, easier to scale, and easier to test.

Thus, we wanted to create a solution that would take the best from both the React world and the pre-React world.

## Why Redux

- Historical reasons: at the time the framework was being developed, Redux was the mainstream solution.
- Currently, there are and continue to be a huge number of applications built on Redux that can benefit from the framework.
- The basic Redux implementation in its original form is simple, understandable, and fairly extensible, allowing you to build a more advanced solution on top of it.

## Why redux-saga

- The library has a very powerful yet small API (compared to, for example, RxJS).
- It provides enormous flexibility when working with asynchrony, making it easy to write complex things.
- It allows you to describe any arbitrarily complex scenario in one place without scattering it in pieces (as `redux-thunk` does, for example).
- It allows you to completely separate and conveniently test business logic independently from UI.
- Thanks to generators at its core, it provides out-of-the-box cool features, such as the ability to granularly cancel any complex async logic without needing to pass abort controllers and check for cancellation in many places.

## Requirements

- React 16+ (supports 16, 17, 18, 19)
- Redux, react-redux, redux-saga
- Immutable.js
- TypeScript with `experimentalDecorators: true`

## Next Steps

- [Getting Started](./getting-started) - Set up Sagun in your project
- [Core Concepts](./concepts/operations) - Learn about Operations and Services
- [API Reference](./api/services) - Detailed API documentation

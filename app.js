const express = require('express');
const bodyParser = require('body-parser');
const graphqlHttp = require('express-graphql');
const { buildSchema } = require('graphql');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Event = require('./models/event');
const User = require('./models/user');

const app = express();

const events = [];

app.use(bodyParser.json());

app.get('/', (req, res, next) => {
    res.send('Hello')
})

app.use('/graphql', graphqlHttp({
    schema: buildSchema(`
        type Event {
            _id: ID!
            title: String!
            description: String!
            price: Float!
            date: String!
        }

        type User {
            _id: ID!
            email: String!
            password: String
        }

        input EventInput {
            title: String!
            description: String!
            price: Float!
            date: String!
        }

        input UserInput{
            email: String!
            password: String!
        }

        type RootQuery {
            events: [Event!]!
        }

        type RootMutation {
            createEvent(eventInput: EventInput): Event
            createUser(userInput: UserInput): User
        }

        schema {
            query: RootQuery
            mutation: RootMutation
        }
    `),
    rootValue: {
        events: () => {
            return Event.find()
                .then(events => {
                    return events.map(event => {
                        console.log('event :', event._doc);
                        return { ...event._doc }
                    })
                })
                .catch(err => {
                    throw err;
                });
        },
        createEvent: args => {
            const event = new Event({
                title: args.eventInput.title,
                description: args.eventInput.description,
                price: +args.eventInput.price,
                date: new Date(args.eventInput.date),
            })

            return event
                .save()
                .then(result => {
                    console.log('result :', result);
                    return { ...result._doc };
                })
                .catch(err => {
                    console.log('err :', err);
                    throw err;
                }) 
        },
        createUser: args => {
            return User.findOne({ email: args.userInput.email })
                .then(user => {
                    if (user) {
                        throw new Error('Urser exists already')
                    }
                    return bcrypt.hash(args.userInput.password, 12)

                })
                .then(hashedPassword => {
                    const user = new User({
                        email: args.userInput.email,
                        password: hashedPassword,
                    })
                    return user.save();
                })
                .then(result => {
                    return { ...result._doc, password: null }
                })
                .catch(err => {
                    throw err
                })

        }
    },
    graphiql: true
}))

mongoose.connect(`mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0-xgdbx.mongodb.net/gql-test?retryWrites=true&w=majority`)

app.listen(4000);
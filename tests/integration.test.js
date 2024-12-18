const request = require('supertest');
const app = require('../index');
const server = require('../server');
const {User} = require('../Models/userModel');
const {sequelize, testDbConnection} = require('../db');
const { client } = require('../logger');
const appVersion = "v1";

beforeAll(async() => {
    await sequelize.drop();
    await sequelize.sync({force:true}).then(console.log('Synced inside test'));
})

const postData = {
    email: process.env.TEST_POSTDATA_EMAIL,
    password: process.env.TEST_POSTDATA_PASS,
    first_name: process.env.TEST_POSTDATA_FIRSTNAME,
    last_name: process.env.TEST_POSTDATA_LASTNAME
}

const changeData = {
    password: process.env.TEST_CHANGE_PASSWORD,
    first_name: process.env.TEST_CHANGE_FIRSTNAME
}

//Creating account and then use get to validate if acc exists
describe(`TEST! - Create and get user at /${appVersion}/user`, ()=> {
    it("should respond w expected response", async() => {
        console.log("Entering test1");
        const response = await request(app)
            .post(`/${appVersion}/user`)
            .send(postData)
            .expect(201);

        const curr_user = await User.findOne({where: {email: postData.email}})
        curr_user.verified = true
        await curr_user.save();
    });

    it("should retrieve user info", async() => {
        console.log("Entering test2");
        const response = await request(app)
            .get(`/${appVersion}/user/self`)
            .auth(postData.email,postData.password)
            .expect(200);
    });
});

describe(`Test2 - Edit user and get user at /${appVersion}/user`, () => {
    it("should respond with expected response", async() => {
        const response = await request(app).
            put(`/${appVersion}/user/self`)
            .auth(postData.email, postData.password)
            .send(changeData);
            
        expect(response.status).toBe(204);
    })

    it("should retrieve user info", async() => {
        const response = await request(app)
            .get(`/${appVersion}/user/self`)
            .auth(postData.email,changeData.password);

            expect(response.status).toBe(200);
    });
})

afterAll(async() => {
    // await User.destroy({
    //     where: {
    //         email: postData.email
    //     }
    // });
    //sequelize.close()
    // console.log('Closed Sequelize');
    client.socket.close();
    server.close();
    
})
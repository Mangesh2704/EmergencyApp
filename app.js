require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const axios = require('axios');
const twilio = require('twilio');
const VoiceResponse = require('twilio').twiml.VoiceResponse;

const response = new VoiceResponse();

app.use(express.json());
response.say('Hello how are you boy!');

console.log(response.toString());

app.use(bodyParser.json());
app.use(cors());
app.use(express.static("./"));
app.use(express.urlencoded({ extended: true }));



const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);



app.post('/api/call', (req, res) => {

    const { phoneNumber,userLocation } = req.body;
    // const userLocation = '37.7749, -122.4194';
    console.log("phone: " + phoneNumber +"user loc: "+ userLocation);
    const parts = userLocation.split(',');

    const latitude = parts[0].split(':')[1].trim();
    const longitude = parts[1].split(':')[1].trim();

    console.log("lat: " + latitude + "long: " + longitude);
    client.calls.create({
        to: phoneNumber,
        from: +17066372039,
        // twiml: "<Response><Say>Ahoy, World!</Say></Response>",
        url: `http://your-server.com/twiml?location=${encodeURIComponent(userLocation)}`
    }).then(call => {
        client.messages.create({
            from: 'whatsapp:+14155238886',  // Twilio sandbox number or WhatsApp-enabled number
            body: `This is an emergency call. The user's location is ${userLocation}`,
            to: `whatsapp:${phoneNumber}`,  // The recipient's WhatsApp number
            persistentAction: [`geo:${latitude},${longitude}`]
        })
            .then(message => console.log('Message sent:', message.sid))
            .catch(error => console.error('Error sending message:', error));

        res.status(200).json({ message: 'Call initiated', callSid: call.sid });
    }).catch(error => {
        console.log("error here")
        res.status(500).json({ error: error.message });
    });
});

app.get('/api/demo', (req, res) => {
    const selectedOption = req.body.option;
    const apiUrl = options[selectedOption];
    res.json({ message: `API called: ${apiUrl}` });
    console.log("api called demo")
})

const options = [
    'police','ambulance','point','womenSafety','fire','cyberSafety','childSafety'
];

const option = {
    'police': +918108070876,
    'fire': +918291851993,
    'ambulance': +918976010177,
    'womenSafety': +919653293956,
    'cyberSafety': +918108070876,
    'childSafety': +919372993879,
};

// Endpoint to handle suggestions
app.post('/suggest', (req, res) => {
    const userInput = req.body.input.toLowerCase();
    // console.log(userInput)

    // const suggestions = Object.keys(options).filter(option =>
    //     option.startsWith(userInput)
    // );

    const suggestions = options.filter(option =>
        option.startsWith(userInput)
    );
    console.log("in")
    console.log("suggestions:"+suggestions);
    res.json({ suggestions: suggestions.length ? suggestions : [] });
});

// Endpoint to handle option selection and API call
app.post('/select', async (req, res) => {
    const selectedOption = req.body.option;
    const userLocation = req.body.userLocation;
    const phoneNumber = option[selectedOption];
    console.log("phone: " + phoneNumber);
    console.log("userlocation: "+userLocation);
    const apiUrl = 'http://localhost:3000/api/call';
    // console.log("here"+selectedOption)
    if (apiUrl) {
        // Call the API or perform any action you want here
        // Simulating an API call response
        console.log("api called" + apiUrl)
        res.json({ message: `API called: ${apiUrl}` });

        const bodyToSend = {
            key1: 'value1',
            key2: 'value2',
        };
        const response = await axios.post(apiUrl,
            {phoneNumber,userLocation}
            , {
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then(response => {
                console.log("done")
            }).catch(error => {
                console.error('There was an error making the call!', error);
            });;

    } else {
        res.status(400).json({ error: 'Invalid option selected' });
    }
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});

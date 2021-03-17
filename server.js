'use strict';

//requires
require('dotenv').config();
const express = require('express');
const pg = require('pg');
const superagent = require('superagent');
const methodOverride = require('method-override');

//express server
const app = express();

//PORT
const PORT = process.env.PORT || 3030;


//useses
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static('./public'));
app.set('view engine', 'ejs');

// switch when finished

// const client = new pg.Client(process.env.DATABASE_URL);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

/******ROUTS*******/
app.get('/', homeHandler)
app.get('/getCountryResult', getCountryResultHandler)
app.get('/AllCountries', AllCountriesHandler)
app.post('/MyRecords', addToDBHandler)
app.get('/MyRecords', MyRecordsHandler)
app.get('/details/:id', RecordDetailsHandler)
app.delete('/details/:id', deleteRecordDetailsHandler)




////homeHandler
function homeHandler(req, res) {
    let URL = 'https://api.covid19api.com/world/total';
    superagent.get(URL)
        .then(result => {

            res.render('pages/Home', { data: result.body })
        }).catch(error => errorHandler(error));

}
///getCountryResultHandler
function getCountryResultHandler(req, res) {
    let { Country, from, to } = req.query;
    let URL = `https://api.covid19api.com/country/${Country}/status/confirmed?from=${from}T00:00:00Z&to=${to}T00:00:00Z`;
    superagent.get(URL)
        .then(result => {
            res.render('pages/getCountryResult', { data: result.body })
        }).catch(error => errorHandler(error));

}

///AllCountriesHandler
function AllCountriesHandler(req, res) {
    let URL = 'https://api.covid19api.com/summary'
    superagent.get(URL)
        .then(result => {
            let allCountries = result.body.Countries.map(country => {
                return new Country(country);
            })
            res.render('pages/AllCountries', { data: allCountries })
        }).catch(error => errorHandler(error));


}
//constructor
function Country(element) {
    this.Country = element.Country;
    this.TotalConfirmed = element.TotalConfirmed;
    this.TotalDeaths = element.TotalDeaths;
    this.TotalRecovered = element.TotalRecovered;
    this.Date = element.Date;
}

////addToDBHandler
function addToDBHandler(req, res) {
    let { Country, TotalConfirmed, TotalDeaths, TotalRecovered, Date } = req.body;
    let SQL = 'INSERT INTO country ( Country, TotalConfirmed, TotalDeaths, TotalRecovered, Date) VALUES ($1,$2,$3,$4,$5);';
    let safeValues = [Country, TotalConfirmed, TotalDeaths, TotalRecovered, Date];
    client.query(SQL, safeValues)
        .then(() => {
            res.redirect('/MyRecords')
        }).catch(error => errorHandler(error));
}

//MyRecordsHandler
function MyRecordsHandler(req, res) {
    let SQL = 'SELECT * FROM country;';
    client.query(SQL)
        .then(result => {
            if (result.rows.length > 0) {

                res.render('pages/MyRecords', { data: result.rows })
            } else {
                res.render('pages/NOAVAILABLE')
            }

        }).catch(error => errorHandler(error));
}

//RecordDetailsHandler
function RecordDetailsHandler(req, res) {
    let id = req.params.id;
    let SQL = 'SELECT * FROM country WHERE id=$1;';
    let safeValue = [id];
    client.query(SQL, safeValue)
        .then(result => {
            res.render('pages/RecordDetails', { data: result.rows })

        }).catch(error => errorHandler(error));
}

//deleteRecordDetailsHandler
function deleteRecordDetailsHandler(req, res) {
    let id = req.params.id;
    let SQL = 'DELETE FROM country WHERE id=$1;';
    let safeValue = [id];
    client.query(SQL, safeValue)
        .then(() => {
            res.redirect('/MyRecords');
        }).catch(error => errorHandler(error));

}
//errorHandler

function errorHandler(error, req, res) {
    res.status(500).send(error);
}

function errorNotFound(req, res) {
    res.status(404).send('Page NOT FOUND :(')
}





//pg connection

client.connect()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Listening to PORT ${PORT}`);
        })
    })
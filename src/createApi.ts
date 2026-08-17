import express from 'express'

const createApi = () => {
    const app = express()
    app.use(express.json)

    return app
}

export default createApi
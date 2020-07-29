const express = require('express')
const http = require('http')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage: genM, generateLocationMessage: genLM} = require('./utils/messages')
const {
    addUser,
    removeUser,
    getUser,
    getUsersInRoom
} = require('./utils/users')
const users = require('./utils/users')


const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000

app.use(express.static('public'))

io.on('connection', (socket) => {
    console.log('new websocket connection')

    socket.on('sendMessage', (msg, callback) => {
        const user = getUser(socket.id)
        if (!user) {
            return callback('Please, enter a room to send messages.')
        }

        const filter = new Filter()
        if (filter.isProfane(msg)) {
            return callback('Profanity is not allowed.')
        }

        io.to(user.room).emit('message', genM(user.username, msg))
        callback()
    })

    socket.on('disconnect', () => {
        // console.log('disconnecting user id', socket.id)
        const user = removeUser(socket.id)
        
        if (user) {
            // no need to use socket.broadcast b/c current user just disconnected
            io.to(user.room).emit('message', genM('Admin', `${user.username} has left.`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })

    socket.on('sendLocation', ({ latitude, longitude }, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('receiveLocation', genLM(user.username, `https://google.com/maps?q=${latitude},${longitude}`))
        callback()
    })

    socket.on('join', (options, callback) => {
        const { error, user } = addUser({
            id: socket.id,
            ...options
        })

        if (error) {
            return callback(error)
        }

        socket.join(user.room)
        socket.emit('message', genM(user.username, 'Welcome!'))
        socket.broadcast.to(user.room).emit('message', genM('Admin', `${user.username} has joined!`))
        io.to(user.room).emit('roomData', { 
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()
    })
})

server.listen(port, () => {
    console.log('App up and running on port ', port)
})
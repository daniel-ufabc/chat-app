const socket = io()

// Elements
const $messageForm = document.querySelector('#message-form')
const $messageFormInput = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button')
const $sendLocationButton = document.querySelector('#send-location')
const $messages = document.querySelector('#messages')

// Templates
const messageTemplate = document.querySelector('#message-template').innerHTML
const locationTemplate = document.querySelector('#location-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

// Options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true }) 

const autoscroll = () => {
    // New message element
    const $newMessage = $messages.lastElementChild

    // Get the height of new message
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin

    // VisibleHeight
    const visibleHeight = $messages.offsetHeight

    // Height of messages container
    const containerHeight = $messages.scrollHeight

    // How far have I scrolled
    const scrollOffset = $messages.scrollTop + visibleHeight

    if (containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight
    }
}

socket.on('message', (obj) => {
    const msg = obj.text
    console.log(obj)
    const html = Mustache.render(messageTemplate, {
        username: obj.username,
        message: msg, 
        createdAt: moment(obj.createdAt).format('h:mm a')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

socket.on('receiveLocation', (obj) => {
    const html = Mustache.render(locationTemplate, { 
        username: obj.username,
        message: obj.url,
        createdAt: moment(obj.createdAt).format('h:mm a')      
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})


socket.on('roomData', ({ room, users }) => {
    const html = Mustache.render(sidebarTemplate, { room, users })
    document.querySelector(".chat__sidebar").innerHTML = html
})

$messageForm.addEventListener('submit', (e) => {
    e.preventDefault()

    $messageFormButton.setAttribute('disabled', 'disabled')

    // last argument is callback that runs when event is acknowledge
    socket.emit('sendMessage', $messageFormInput.value, (error) => {
        $messageFormButton.removeAttribute('disabled')
        $messageFormInput.value = ''
        $messageFormInput.focus()

        if (error) {
            return console.log(error)
        }

        console.log('The message was recieved.')
    })
})
    
$sendLocationButton.addEventListener('click', () => {
    if (!navigator.geolocation) {
        return alert('Sorry, your browser does not support the Geolocation API.')
    }

    $sendLocationButton.setAttribute('disabled', 'disabled')

    navigator.geolocation.getCurrentPosition((position) => {
        console.log('Position', position)
        const latitude = position.coords.latitude
        const longitude = position.coords.longitude

        socket.emit('sendLocation', { latitude, longitude }, () => {
            console.log('Location was sent successfully!')
            $sendLocationButton.removeAttribute('disabled')
        })        
    })
})

socket.emit('join', { username, room }, (error) => {
    if (error) {
        alert(error)
        location.href = '/'
    }
})

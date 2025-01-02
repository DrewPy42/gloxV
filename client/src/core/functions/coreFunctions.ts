export function displayDateTime(date: any) {
  let datePart = ''
  let timePart = ''
  if (date) {
    const dateTime = new Date(date)
    datePart = `${dateTime.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}`
    timePart = `${dateTime.toLocaleTimeString()}`
  }
  return `${datePart} ${timePart}`
}

export function displayDateTimeFull(date: any) {
  let datePart = ''
  let timePart = ''
  if (date) {
    const dateTime = new Date(date)
    datePart = `${dateTime.toLocaleDateString(undefined, {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    })}`
    timePart = `${dateTime.toLocaleTimeString()}`
  }
  return `${datePart} ${timePart}`
}

export function displayDateOnly(date: any) {
  let datePart = ''
  if (date) {
    const dateTime = new Date(date)
    datePart = `${dateTime.toLocaleDateString(undefined, {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    })}`
  }
  return `${datePart}`
}

export function displayBool(value: number | string) {
  if (value === '0' || value === 0) {
    return 'No'
  }
  return 'Yes'
}

export function getAge(date: any) {
  const dateTime: typeof date = new Date(date)
  const currentDate: typeof date = new Date()
  const days: number = Math.round((currentDate - dateTime) / (1000 * 3600 * 24))
  const hours: number = Math.round(((currentDate - dateTime) / (1000 * 60 * 60)) % 24)
  const minutes: number = Math.round(((currentDate - dateTime) / (1000 * 60)) % 60)
  return `${days}D ${hours}H ${minutes}M`
}

// export function makeLink(workspace : string, id : number, text : string = '') {
//   let linkText : string | number = text;
//   if (!text) {
//     linkText = id;
//   }
//   switch (workspace) {
//     case 'vendor-ams':
//     case 'vendor':
//       return `<a href=${"/vendor/" + id + "/view"}>${linkText}</a>`
//     case 'move':
//       return `<a href=${"/move/" + id + "/view"}>${linkText}</a>`
//     default:
//       return linkText;
//   }
// }

export function sortByObjectText(a: any, b: any) {
  const aVal = a.text
  const bVal = b.text
  if (aVal < bVal) return -1
  if (aVal > bVal) return 1
  return 0
}

export function getCurrentSQLDate() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

export function displayAsCurrency(price: number) {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  })
  return formatter.format(price)
}

export function displayAsPhoneNumber(number: number) {
  //Filter only numbers from the input
  const cleaned = ('' + number).replace(/\D/g, '')

  //Check if the input is of correct length
  let match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)

  if (match) {
    return '(' + match[1] + ') ' + match[2] + '-' + match[3]
  }

  return null
}

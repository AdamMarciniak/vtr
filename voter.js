const util = require('util')

const exec = util.promisify(require('child_process').exec)

const axios = require('axios')

const associateCommand =
  'aws ec2 associate-address --instance-id i-0cdb1e28cc4b9e4ea --public-ip 35.84.113.123'

const disassociateCommand =
  'aws ec2 disassociate-address --public-ip 35.84.113.123'

const asso = async () => {
  const { stdout, stderr } = await exec(associateCommand)
  console.log('stdout:', stdout)
  console.log('stderr:', stderr)
}

const disasso = async () => {
  const { stdout, stderr } = await exec(disassociateCommand)
  console.log('stdout:', stdout)
  console.log('stderr:', stderr)
}

const refreshIP = async () => {
  await asso()
  await disasso()
}

const siteLink =
  'https://www.10best.com/awards/travel/best-escape-room/boxaroo-boston/'
const validationKeyLink = (k) =>
  `https://www.10best.com/common/ajax/voteKey.php?key=${k}`
const voteLink = (k, v, r) =>
  `https://www.10best.com/common/ajax/vote.php?voteKey=${k}&validationKey=${v}&email=&c=${r}`

const getVoteKeys = async () => {
  const result = await axios.get(siteLink)
  const validationKeyGetter = result.data
    .split(`onclick="vote('`)[1]
    .split(`')`)[0]
  const actualVoteKey = result.data
    .split(`voteKey" value="`)[1]
    .split(`" />`)[0]
  return [validationKeyGetter, actualVoteKey, result.headers['set-cookie']]
}

const getValidationKey = async (voteKey, inputCookies) => {
  const result = await axios.request({
    method: 'GET',
    headers: { Cookies: inputCookies.join('; ') },
    url: validationKeyLink(encodeURIComponent(voteKey)),
  })
  return result.data.results.validationKey
}

const vote = async () => {
  const [validationKeyGetter, actualVoteKey, cookies] = await getVoteKeys()
  const mappedCookies = cookies
    .filter((c) => c.includes('domain=www.10best.com'))
    .map((c) => c.split('; ')[0])
  mappedCookies.push('OX_sd=1')
  const validationKey = await getValidationKey(
    validationKeyGetter,
    mappedCookies,
  )
  const voteResponse = await axios.request({
    method: 'GET',
    headers: { Cookie: mappedCookies.join('; ') },
    url: voteLink(
      encodeURIComponent(actualVoteKey),
      encodeURIComponent(validationKey),
      Math.random(),
    ),
  })

  if (voteResponse.data.results.success === '1') {
    return true
  } else {
    console.log(voteResponse.data.results.errors)
    throw new Error(
      `Something went wrong: ${voteResponse.data.results.errors.length} error(s)`,
    )
  }
}

let count = 0
const startTime = Date.now()

const voteContinuously = async () => {
  if (count < 499) {
    while (true) {
      if (count >= 499) {
        break
      }
      try {
        const result = await vote()
        count++
        const now = Date.now()
        const msSinceStart = now - startTime
        console.log(
          count,
          `(${(count / (msSinceStart / (1000 * 60))).toFixed(2)}/min)`,
        )
      } catch (e) {
        console.error(e)
        break
      }
    }
  }

  break
}

const run = async () => {
  await refreshIP()

  voteContinuously()
}

run()

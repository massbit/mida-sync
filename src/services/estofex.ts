import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'

export const getEstofexReport = async () => {
    const xmlUrl = 'https://www.estofex.org/cgi-bin/polygon/showforecast.cgi?xml=yes'

    const xmlData = await axios.get(xmlUrl).then((response) => response.data)

    const parser = new XMLParser()
    const jsonData = parser.parse(xmlData)

    return jsonData
}

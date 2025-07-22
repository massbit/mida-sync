interface NotifireIntervention {
    id: string
    latitude: number
    longitude: number
    radius: number
    sender: string
    startTime: string
    tips: {
        showCallBtn: boolean
        standard: boolean
        text: string
    }[]
    title: string
    type: number
}

export const getInterventionsFromNotifire = async (): Promise<NotifireIntervention[]> => {
    // return axios
    //     .get(
    //         `https://notifire.vigilfuoco.it/notifire/rest/alerts?latitude=${MilanCoordinates.latitude}&longitude=${MilanCoordinates.longitude}&language=it`
    //     )
    //     .then((response) => response.data)
    return [
        {
            id: 'com.milano@cert.vigilfuoco.it,2.49.0.1.380.2.3.15.20250720.0.65.0,2025-07-20T17:03:26+02:00',
            latitude: 44.6228929,
            longitude: 11.6612831,
            radius: 20000,
            sender: 'Comando Provinciale MI',
            startTime: '2025-07-20T15:05:00+0000',
            tips: [
                {
                    showCallBtn: true,
                    standard: true,
                    text: 'Squadre attivate. Chiama solo se sei in pericolo.',
                },
            ],
            title: 'Incendio normale (generico)',
            type: 99,
        },
        {
            id: 'com.milano@cert.vigilfuoco.it,2.49.0.1.380.2.3.15.20250720.0.60.0,2025-07-20T16:31:25+02:00',
            latitude: 45.5147781,
            longitude: 9.1455841,
            radius: 20000,
            sender: 'Comando Provinciale MI',
            startTime: '2025-07-20T14:32:00+0000',
            tips: [
                {
                    showCallBtn: true,
                    standard: true,
                    text: 'Squadre attivate. Chiama solo se sei in pericolo.',
                },
            ],
            title: "Danni d'acqua in genere",
            type: 99,
        },
        {
            id: 'com.milano@cert.vigilfuoco.it,2.49.0.1.380.2.3.15.20250720.0.62.0,2025-07-20T16:47:33+02:00',
            latitude: 45.4407082,
            longitude: 9.2639999,
            radius: 20000,
            sender: 'Comando Provinciale MI',
            startTime: '2025-07-20T14:48:00+0000',
            tips: [
                {
                    showCallBtn: true,
                    standard: true,
                    text: 'Squadre attivate. Chiama solo se sei in pericolo.',
                },
            ],
            title: 'Incendio normale (generico)',
            type: 99,
        },
        {
            id: 'com.milano@cert.vigilfuoco.it,2.49.0.1.380.2.3.15.20250720.0.66.0,2025-07-20T17:16:42+02:00',
            latitude: 45.5221825,
            longitude: 9.3190765,
            radius: 20000,
            sender: 'Comando Provinciale MI',
            startTime: '2025-07-20T15:17:00+0000',
            tips: [
                {
                    showCallBtn: true,
                    standard: true,
                    text: 'Squadre attivate. Chiama solo se sei in pericolo.',
                },
            ],
            title: 'Incendio normale (generico)',
            type: 99,
        },
        {
            id: 'com.milano@cert.vigilfuoco.it,2.49.0.1.380.2.3.15.20250720.0.64.0,2025-07-20T17:02:02+02:00',
            latitude: 45.4535027,
            longitude: 9.0868473,
            radius: 20000,
            sender: 'Comando Provinciale MI',
            startTime: '2025-07-20T15:10:00+0000',
            tips: [
                {
                    showCallBtn: true,
                    standard: true,
                    text: 'Squadre attivate. Chiama solo se sei in pericolo.',
                },
            ],
            title: 'Alberi pericolanti',
            type: 99,
        },
    ]
}

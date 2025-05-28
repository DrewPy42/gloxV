export default function() {
    return {
        volumeEditDropdown: {
            id: 'volumeEditDropdown',
            label: 'Volume Edit',
            options: [
                { value: 'edit', label: 'Edit Volume' },
                { value: 'delete', label: 'Delete Volume' },
                { value: 'clone', label: 'Clone Volume' },
                { value: 'issues', label: 'View Issues' },    
            ]
        },
    }
}
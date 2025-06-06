export function getVolumeEditDropDown() {
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

export function getIssueEditDropDown() {
    return {
        issueEditDropdown: {
            id: 'issueEditDropdown',
            label: 'Issue Edit',
            options: [
                { value: 'edit', label: 'Edit Issue' },
                { value: 'delete', label: 'Delete Issue' },
                { value: 'clone', label: 'Clone Issue' },
                { value: 'view', label: 'View Details' },    
            ]
        },
    }
}


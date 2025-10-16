export interface VolumeModel {
    volume_id: number
    title_id: number
    volume_number: number
    issue_range?: string
    start_date?: Date
    end_date?: Date
    missing_issues?: string
    notes?: string
    created_date?: Date
    modified_date?: Date
}
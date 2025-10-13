# Store Pattern Usage

## Creating a New Dashboard Store

To create a new store for any dashboard, follow this pattern:

```typescript
import { defineStore } from 'pinia'
import createState from './createState'
import type { defaultStore } from './defaultStore'
import { createDefaultActions } from './defaultActions'

export const useYourEntityStore = defineStore('yourEntity', () => {
  const state: defaultStore = createState()
  
  // Set store-specific properties
  state.storeName = 'yourEntity'
  state.baseURL.value = 'http://localhost:3000/api/your-endpoint'
  state.recordType.value = 'your entity name'

  // Create default actions
  const actions = createDefaultActions(state)

  // Add any custom actions specific to this entity
  const customAction = () => {
    // Your custom logic here
  }

  return {
    // State
    ...state,
    
    // Actions
    ...actions,
    customAction
  }
})
```

## Available Default Actions

- `fetchRecords(page?, limit?)` - Fetch data with pagination
- `changePage(page)` - Change to a specific page
- `setSortOptions(field, direction?)` - Set sorting options
- `setFilters(filters)` - Set filter criteria
- `setPerPage(perPage)` - Change items per page
- `refreshData()` - Refresh current data

## Usage in Components

```vue
<script>
import { useYourEntityStore } from '@/core/stores/yourEntityStore'

export default {
  setup() {
    const store = useYourEntityStore()
    
    onMounted(() => {
      store.fetchRecords()
    })
    
    return { store }
  }
}
</script>
```

import { defaultStore } from './defaultStore'
import { fetchWrapper } from '../../core'
import { ref } from 'vue'

export default function createActions(state: defaultStore) {
  function getFieldType(fieldName: string): string {
    switch (fieldName) {
      case 'alertid':
      case 'alertrecordid':
      case 'cphone':
      case 'distanceToDestination':
      case 'grpapphone':
      case 'id':
      case 'locid':
      case 'locphone':
      case 'mdzip':
      case 'mmiles':
      case 'mpzip':
      case 'nmid':
      case 'uid':
      case 'uphone':
      case 'wheels':
        return 'number'
      case 'alertdts':
      case 'mdatetime':
      case 'mpsdts':
      case 'ndts':
      case 'uadddts':
      case 'ulastlogin':
        return 'date'
      case 'fullname':
        return 'fullname'
      default:
        return 'string'
    }
  }

  function getFilterField(filterKey: string): string {
    let fieldName = ''
    switch (filterKey) {
      case 'afterDateFilter':
        switch (state.storeName) {
          case 'notes':
            fieldName = 'ndts'
            break
        }
        break
      case 'beforeDateFilter':
        switch (state.storeName) {
          case 'notes':
            fieldName = 'ndts'
            break
        }
        break
      case 'groupFilter':
        if (state.storeName === 'clients' || state.storeName === 'groups') {
          fieldName = 'grpname'
        }
        break
      case 'locationFilter':
        if (state.storeName === 'clients') {
          fieldName = 'loccity'
        }
        break
      case 'manufacturerFilter':
        fieldName = 'brand'
        break
      case 'sidewallFilter':
        fieldName = 'side_wall'
        break
      case 'stateFilter':
        if (state.storeName === 'clients') {
          fieldName = 'locst'
        }
        break
      case 'statusFilter':
        if (state.storeName === 'groups') {
          fieldName = 'grpview'
        }
        if (state.storeName === 'users') {
          fieldName = 'ustatus'
        }
        break
      case 'userFilter':
        fieldName = ''
        break
      case 'vehicleTypeFilter':
        fieldName = 'vehicle_type'
        break
      case 'vendorFilter':
        fieldName = 'cconame'
        break
      case 'weightRangeFilter':
        fieldName = 'weight_range'
        break
    }
    return fieldName
  }

  function handleFilters(): any {
    const records = state.found.value
    const filters = state.filters.value
    if (records !== null && records !== undefined) {
      let filtered: any = null
      if (filters !== null && filters !== undefined) {
        Object.entries(filters).forEach((entry) => {
          const key = entry[0]
          let value: any = entry[1]
          if (!!value) {
            const field = getFilterField(key)
            switch (key) {
              case 'afterDateFilter':
                filtered = records.filter((obj) => {
                  const filterDate = new Date(value)
                  const recordDate = new Date(obj[field])
                  return recordDate.getTime() <= filterDate.getTime()
                })
                break
              case 'beforeDateFilter':
                filtered = records.filter((obj) => {
                  const filterDate = new Date(value)
                  const recordDate = new Date(obj[field])
                  return recordDate.getTime() <= filterDate.getTime()
                })
                break
              case 'statusFilter':
                if (field === 'grpview') {
                  value = entry[1] === 'Enabled' ? 'Yes' : 'No'
                } else {
                  value = entry[1]
                }
                filtered = records.filter((obj) => {
                  return obj[field] === value
                })
                break
              case 'userFilter':
                filtered = records.filter((obj) => {
                  return obj['ufirstn'] + ' ' + obj['ulastn'] === value
                })
                break
              case 'weightRangeFilter':
                filtered = records.filter((obj) => {
                  return obj[field] <= value
                })
                break
              default:
                filtered = records.filter((obj) => {
                  return obj[field] === value
                })
            }
          }
        })
      }
      if (filtered !== null && filtered !== undefined) {
        return filtered
      } else {
        return records
      }
    }
    return records
  }

  function handleFlags() {
    let flagString: string = ''
    flagString += `&page_size=${state.perPage.value}`
    flagString += `&page_number=${state.currentPage.value}`
    flagString += `&order_field=${state.currentSort.value}`
    flagString += `&order=${state.currentSortDir.value}`
    //YYYY-mm-dd
    // if (!!state.flags.value.after) {
    //   flagString += `&after=${state.flags.value.after}`;
    // }
    // if (!!state.flags.value.before) {
    //   flagString += `&before=${state.flags.value.before}`;
    // }
    // if (!!state.flags.value.cat) {
    //   flagString += `&cat=${state.flags.value.cat}`;
    // }
    // if (!!state.flags.value.charge) {
    //   flagString += `&charge=${state.flags.value.charge}`;
    // }
    // if (!!state.flags.value.client) {
    //   flagString += `&client=${state.flags.value.client}`;
    // }
    // if (!!state.flags.value.coverage) {
    //   flagString += `&coverage=${state.flags.value.coverage}`;
    // }
    // if (!!state.flags.value.department) {
    //   flagString += `&department=${state.flags.value.department}`;
    // }
    // if (!!state.flags.value.height) {
    //   flagString += `&height=${state.flags.value.height}`;
    // }
    // if (!!state.flags.value.group) {
    //   flagString += `&group=${state.flags.value.group}`;
    // }
    // if (!!state.flags.value.i_status) {
    //   flagString += `&i_status=${state.flags.value.i_status}`;
    // }
    // if (!!state.flags.value.labor) {
    //   flagString += `&labor=${state.flags.value.labor}`;
    // }
    // if (!!state.flags.value.labor_status) {
    //   flagString += `&labor_status=${state.flags.value.labor_status}`;
    // }
    // if (!!state.flags.value.location) {
    //   flagString += `&location=${state.flags.value.location}`;
    // }
    // if (!!state.flags.value.lot) {
    //   flagString += `&lot=${state.flags.value.lot}`;
    // }
    // if (!!state.flags.value.move_number) {
    //   flagString += `&move_number=${state.flags.value.move_number}`;
    // }
    // if (!!state.flags.value.ply) {
    //   flagString += `&ply=${state.flags.value.ply}`;
    // }
    // if (!!state.flags.value.region) {
    //   flagString += `&region=${state.flags.value.region}`;
    // }
    // if (!!state.flags.value.service) {
    //   flagString += `&service=${state.flags.value.service}`;
    // }
    // if (!!state.flags.value.state) {
    //   flagString += `&state=${state.flags.value.state}`;
    // }
    // if (!!state.flags.value.timezone) {
    //   flagString += `&timezone=${state.flags.value.timezone}`;
    // }
    // if (!!state.flags.value.vendor) {
    //   flagString += `&vendor=${state.flags.value.vendor}`;
    // }
    // if (!!state.flags.value.zip) {
    //   flagString += `&zip=${state.flags.value.zip}`;
    // }
    return encodeURI(flagString)
  }

  // function setUniqueList(fieldName: string, idField: string = '') : any {
  //   const uniqueIds: any[] = [];
  //   const uniqueList: any = ref([]);
  //   // let idValue = null;
  //   if (state.found.value !== null && state.found.value !== undefined) {
  //     if (!idField) {
  //       const unique = state.found.value.filter(element => {
  //         const fieldValue = element[fieldName];
  //         if (element[fieldName]) {
  //           // @ts-ignore
  //           const isDuplicate = uniqueIds.includes(fieldValue.toUpperCase());
  //           if (!isDuplicate) {
  //             // @ts-ignore
  //             uniqueIds.push(fieldValue.toUpperCase());
  //             return true;
  //           }
  //           return false;
  //         }
  //       });
  //       uniqueList.value = unique.map(element => element[fieldName]);
  //       uniqueList.value.sort((a : any, b: any) => {
  //         // @ts-ignore
  //         const aVal = <string>a.toLowerCase();
  //         // @ts-ignore
  //         const bVal = <string>b.toLowerCase();
  //         if (aVal < bVal) return -1;
  //         if (aVal > bVal) return 1;
  //         return 0;
  //       });
  //     } else {
  //       // @ts-ignore
  //       const list = state.found.value;
  //       uniqueList.value = list.map(element => ({
  //         key: element[idField],
  //         value: element[fieldName],
  //       }));
  //     }
  //   }
  //   return uniqueList.value;
  // }
  function sortList(records: any[]) {
    let field = state.currentSort.value
    if (records) {
      return records.sort((a, b) => {
        let modifier = 1
        let aVal: number | string
        let bVal: number | string
        if (state.currentSortDir.value === 'desc') modifier = -1
        switch (getFieldType(field)) {
          case 'date':
            aVal = new Date(a[field]).getTime()
            bVal = new Date(b[field]).getTime()
            break
          case 'fullname':
            const aLast = a['ulastn'] ? (<string>a['ulastn']).toLowerCase() : ''
            const aFirst = a['ufirstn'] ? (<string>a['ufirstn']).toLowerCase() : ''
            const bLast = b['ulastn'] ? (<string>b['ulastn']).toLowerCase() : ''
            const bFirst = b['ufirstn'] ? (<string>b['ufirstn']).toLowerCase() : ''
            aVal = aLast + ' ' + aFirst
            bVal = bLast + ' ' + bFirst
            break
          case 'number':
            if (field === 'distanceToDestination') {
              field = 'distanceToDestination'
            }
            aVal = parseFloat(a[field])
            bVal = parseFloat(b[field])
            break
          default:
            aVal = a[field] ? (<string>a[field]).toLowerCase() : ''
            bVal = b[field] ? (<string>b[field]).toLowerCase() : ''
        }
        if (aVal < bVal) return -1 * modifier
        if (aVal > bVal) return modifier
        return 0
      })
    }
  }

  return {
    applyFilters(useFlags: boolean = false): void {
      if (useFlags) {
        this.list(true)
      } else {
        state.records.value = this.displayRecords()
      }
    },
    clearRecords() {
      if (state.records.value) state.records.value = []
      if (state.totalPages.value > 0) state.totalPages.value = 0
      if (state.totalRecords.value >= 0) state.totalRecords.value = -1
      if (state.message.value) state.message.value = ''
      if (state.found.value) state.found.value = []
    },
    displayRecords(useFlags: boolean = false): [] {
      const results: any = ref(state.found.value)
      if (results.value) {
        if (!useFlags) {
          results.value = handleFilters()
          results.value = sortList(results.value)
          const min = (state.currentPage.value - 1) * state.perPage.value
          const max = state.currentPage.value * state.perPage.value
          state.totalRecords.value = results.value.length ? results.value.length : 0
          state.message.value = state.totalRecords.value + ' records found'
          state.totalPages.value = Math.ceil(
            (state.totalRecords.value ? state.totalRecords.value : 0) / state.perPage.value
          )
          return results.value.slice(min, max)
        } else {
          return results.value
        }
      }
      return []
    },
    getPage() {
      state.totalPages.value = Math.ceil(
        (state.totalRecords.value ? state.totalRecords.value : 0) / state.perPage.value
      )
      state.records.value = this.displayRecords()
    },
    async getRecord(id: number): Promise<any> {
      state.loading.value = true
      return await fetchWrapper
        .get(`${state.baseURL.value}/${id}?co=erstires`)
        .then((response) => {
          state.messageRecord.value = response.msg
          return response.data[0]
        })
        .catch((error) => {
          state.messageRecord.value = error
          state.loading.value = false
        })
        .finally(() => (state.loading.value = false))
    },
    // getUniqueList() {
    //   return state.uniqueList.value;
    // },
    handleResponse(response: any, useFlags: boolean = false): void {
      state.message.value = response.msg
      state.found.value = response.data
      state.totalRecords.value = response.count
      if (useFlags) {
        state.totalPages.value =
          Math.ceil(
            (state.totalRecords.value ? state.totalRecords.value : 0) / state.perPage.value
          ) - 1
      }
      state.records.value = this.displayRecords(useFlags)
      // switch (state.storeName) {
      //   case 'clients':
      //     state.uniqueCities.value = setUniqueList('loccity');
      //     state.uniqueList.value = setUniqueList('locname', 'locid');
      //     break;
      //   case 'groups':
      //     state.uniqueGroups.value = setUniqueList('grpname', 'grpid');
      //     break;
      //   case 'tires':
      //     state.uniqueTires.value = setUniqueList('size');
      //     state.uniqueManufacturers.value = setUniqueList('brand');
      //     break;
      //   case 'vehicles':
      //     state.uniqueList .value = setUniqueList('type_name');
      //     break;
      //   case 'vendors':
      //     state.uniqueList.value = setUniqueList('cconame');
      //     break;
      // }
    },
    list(useFlags: boolean = false): void {
      let url = `${state.baseURL.value}?co=erstires`
      state.loading.value = true
      switch (state.storeName) {
        case 'groups':
          url = `${state.baseURL.value}/type/${state.recordType.value}?co=erstires`
          break
        case 'moves':
          url = `${state.baseURL.value}/getByType/${state.recordType.value}?co=erstires`
          break
        default:
          url = `${state.baseURL.value}?co=erstires`
          break
      }
      if (useFlags) {
        const flagData = handleFlags()
        url += `${flagData}`
      }
      fetchWrapper
        .get(url)
        .then((response: any) => {
          if (response.data) {
            this.handleResponse(response, useFlags)
          }
        })
        .catch((error: any) => {
          state.message.value = error
          state.loading.value = false
        })
        .finally(() => (state.loading.value = false))
    },
    setPage(page: number): void {
      state.currentPage.value = page
      state.records.value = this.displayRecords()
    },
    setPageWithFlags(page: number): void {
      state.currentPage.value = page
      this.list(true)
    },
    setPerPage(perPage: number): void {
      state.perPage.value = perPage
      state.records.value = this.displayRecords()
    },
    setPerPageWithFlags(perPage: number): void {
      state.perPage.value = perPage
      state.records.value = this.displayRecords(true)
    },
    setRecordType(type: string): void {
      state.records.value = []
      state.recordType.value = type
    },
    sortColumn(column: string): void {
      if (column === state.currentSort.value) {
        state.currentSortDir.value = state.currentSortDir.value === 'asc' ? 'desc' : 'asc'
      }
      state.currentSort.value = column
      state.records.value = this.displayRecords()
    },
    sortColumnWithFlags(column: string) {
      if (column === state.currentSort.value) {
        state.currentSortDir.value = state.currentSortDir.value === 'asc' ? 'desc' : 'asc'
      }
      state.currentSort.value = column
      this.list(true)
    }
  }
}

/* eslint-disable cypress/no-unnecessary-waiting */
const AIRTABLE_API_BASE_SAMPLE = 'appdxOY0ei028c0AE'
const AIRTABLE_API_KEY_SAMPLE = 'keyWtbZlAQKQ10t1b'

const daysAgo = (nbDays = 0) => (d => new Date(d.setDate(d.getDate() - nbDays)))(new Date()).toISOString().split('T')[0]
const fillDates = json => {
  json.records.forEach(record => {
    const on = record.fields['completed-on']
    if (!on) return
    if (on === '{{ 3-days-ago }}') return (record.fields['completed-on'] = daysAgo(3))
    if (on === '{{ yesterday }}') return (record.fields['completed-on'] = daysAgo(1))
    if (on === '{{ today }}') record.fields['completed-on'] = daysAgo(0)
  })
  return json
}

describe('App', () => {
  it('successfully loads', () => {
    cy.visit('/')
    cy.get('h1').should('contain', 'What now')
  })
  describe('Toaster', () => {
    it('show success toast', () => {
      const message = 'nice success'
      cy.window().then(w => w.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'success', message } })))
      cy.get('.toast.success').should('be.visible').contains(message)
    })
    it('show error toast', () => {
      const message = 'bad news'
      cy.window().then(w => w.dispatchEvent(new CustomEvent('show-toast', { detail: { type: 'error', message } })))
      cy.get('.toast.error').should('be.visible').contains(message)
    })
  })
  describe('Settings', () => {
    beforeEach(() => {
      cy.visit('/')
      cy.get('.settings--trigger').as('trigger')
      cy.get('.settings--modal').as('modal')
      cy.get('.settings--close').as('close')
      cy.get('.settings--save').as('save')
      cy.get('@modal').find('input[name="airtable-api-base"]').as('input-base')
      cy.get('@modal').find('input[name="airtable-api-key"]').as('input-key')
    })
    it('has a button to open modal', () => {
      cy.get('@trigger').should('be.visible')
    })
    it('open & close modal', () => {
      cy.get('@modal').should('not.be.visible')
      cy.get('@trigger').click()
      cy.get('@modal').should('be.visible')
      cy.get('@close').click()
      cy.get('@modal').should('not.be.visible')
    })
    it('cannot submit empty form', () => {
      cy.get('@trigger').click()
      cy.get('@modal').should('be.visible')
      cy.get('@save').click()
      cy.get('@modal').should('be.visible')
    })
    it('pre-fill api fields if found in storage', () => {
      cy.setLS('api-base', AIRTABLE_API_BASE_SAMPLE)
      cy.setLS('api-key', AIRTABLE_API_KEY_SAMPLE)
      cy.visit('/')
      cy.get('@input-base').should('have.value', AIRTABLE_API_BASE_SAMPLE)
      cy.get('@input-key').should('have.value', AIRTABLE_API_KEY_SAMPLE)
    })
    it('cannot submit invalid form', () => {
      cy.get('@trigger').click()
      cy.get('@modal').should('be.visible')
      cy.get('@input-base').clear().type('abc')
      cy.get('@save').click()
      cy.get('@modal').should('be.visible')
      cy.get('@input-base').clear().type(AIRTABLE_API_BASE_SAMPLE)
      cy.get('@input-key').clear().type('abc')
      cy.get('@input-key').trigger('keypress')
      cy.get('@save').click()
      cy.get('@modal').should('be.visible')
    })
    it('can submit valid form', () => {
      cy.get('@trigger').click()
      cy.get('@modal').should('be.visible')
      cy.get('@input-base').type(AIRTABLE_API_BASE_SAMPLE)
      cy.get('@input-key').type(AIRTABLE_API_KEY_SAMPLE)
      cy.get('@save').click()
      cy.get('@modal').should('not.be.visible')
    })
  })
  describe('Tasks', () => {
    before(() => {
      cy.visit('/')
      cy.wait(1000)
    })
    it('load mocked tasks from json', () => {
      cy.fixture('tasks').then((json) => {
        cy.window().then(w => w.dispatchEvent(new CustomEvent('api-response', { detail: fillDates(json) })))
        cy.get('.toast.info').should('be.visible').contains('9 tasks found')
        cy.get('.toast.info').should('be.visible').contains('5 tasks remaining')
      })
    })
    it('show task', () => {
      cy.get('.task--title').should('be.visible').contains('What now')
      cy.get('.task--done').should('be.visible').click()
      cy.get('.task--title').should('be.visible').contains('Trier les mails')
    })
    it('skip current task', () => {
      cy.get('.task--title').should('be.visible').contains('Trier les mails')
      cy.get('.task--next').should('be.visible').click()
      cy.get('.task--title').should('be.visible').contains('Faire une lessive')
    })
    it('mark some tasks as done', () => {
      cy.get('.task--title').should('be.visible').contains('Faire une lessive')
      cy.get('.task--done').should('be.visible').click()
      cy.get('.toast.success').should('be.visible').contains('well done')
      cy.get('.task--title').should('be.visible').contains('Ranger le garage')
      cy.get('.task--done').click()
      cy.get('.task--title').should('be.visible').contains('Trouver des choses à donner ou jeter')
      cy.get('.task--done').click()
    })
    it('show previously skipped task', () => {
      cy.get('.task--title').should('be.visible').contains("Imiter parfaitement le bruit de l'otarie")
      cy.get('.task--done').should('be.visible').click()
    })
    it('mark last task as done, should see final screen', () => {
      cy.get('.task--title').should('be.visible').contains('Trier les mails')
      cy.get('.task--done').should('be.visible').click()
      cy.get('.level-100').should('be.visible')
    })
    it('load empty task list', () => {
      cy.window().then(w => w.dispatchEvent(new CustomEvent('api-response', { detail: { records: [] } })))
      cy.get('.toast.info').should('be.visible').contains('parsing api response')
      cy.get('.toast.error').should('be.visible').contains('no tasks found')
    })
    it('load already done tasks', () => {
      cy.visit('/')
      cy.wait(1000)
      const today = new Date().toISOString().split('T')[0]
      const task = {
        id: 'some-id',
        fields: { name: 'Trier les mails', once: 'day', 'completed-on': today },
      }
      cy.window().then(w => w.dispatchEvent(new CustomEvent('api-response', { detail: { records: [task] } })))
      cy.get('.toast.info').should('be.visible').contains('parsing api response')
      cy.get('.toast.info').should('be.visible').contains('1 tasks found')
      cy.get('.level-100').should('be.visible')
    })
    it('handle bonus task for today', () => {
      cy.visit('/')
      cy.wait(1000)
      const today = new Date().toISOString().split('T')[0]
      const task = { id: 'some-id', fields: { name: 'Trier les mails', once: 'day', 'completed-on': today } }
      const bonusTask1 = { id: 'some-other-id', fields: { name: 'Journée sans sucre', once: 'bonus' } }
      const bonusTask2 = { id: 'same-other-id', fields: { name: 'Journée sans sel', once: 'bonus' } }
      cy.window().then(w => w.dispatchEvent(new CustomEvent('api-response', { detail: { records: [task, bonusTask1, bonusTask2] } })))
      cy.get('.toast.info').should('be.visible').contains('parsing api response')
      cy.get('.toast.info').should('be.visible').contains('3 tasks found')
      cy.get('.toast.info').should('be.visible').contains('only one task left for today')
      cy.get('.task--title').should('be.visible').contains('What now')
      cy.get('.task--done').should('be.visible').click()
      cy.get('.task--title').should('be.visible').contains(bonusTask1.fields.name)
      cy.get('.task--done').should('be.visible').click()
      cy.get('.level-100').should('be.visible')
    })
  })
  describe('Progress', () => {
    before(() => {
      cy.visit('/')
      cy.wait(1000)
    })
    it('load mocked tasks from json', () => {
      cy.fixture('progress').then((json) => {
        cy.window().then(w => w.dispatchEvent(new CustomEvent('api-response', { detail: fillDates(json) })))
        cy.get('.toast.info').should('be.visible').contains('9 tasks found')
        // one of the 9 tasks is another bonus, and 3 tasks already completed so -4 inactives tasks
        cy.get('.toast.info').should('be.visible').contains('5 tasks remaining')
      })
    })
    it('has default progress', () => {
      cy.get('.what-now[data-progress="50"]').should('be.visible')
      cy.get('.progress .level-50').should('be.visible')
    })
    it('ask a task, gain no level', () => {
      cy.get('.task--done').click()
    })
    it('gain levels via completing tasks', () => {
      cy.get('.task--done').click()
      cy.get('.task--title').should('be.visible').contains('name-4')
      cy.get('.task--done').click()
      cy.get('.task--title').should('be.visible').contains('name-5')
      cy.get('.task--done').click()
      cy.get('.what-now[data-progress="80"]').should('be.visible')
      cy.get('.progress .level-80').should('be.visible')
    })
    it('complete last task to reach level max', () => {
      cy.get('.task--title').should('be.visible').contains('name-6')
      cy.get('.task--done').click()
      cy.get('.task--title').should('be.visible').contains('name-8')
      cy.get('.task--done').click()
      cy.get('.what-now[data-progress="100"]').should('be.visible')
      cy.get('.progress .level-100').should('be.visible')
    })
  })
})

@ui @admin
Feature: Admin data management

    @smoke
    Scenario: As an admin, I should see the Veri yönetimi title, seed data types and recent operations, when I open the admin page

    Scenario: As an admin, I should see a busy state and a success or error log entry, when I seed one data group

    Scenario: As an admin, I should see the result of the full seed operation and its failure state, when I click the seed-all button

    Scenario: As an admin, I should see an AI loading state and an updated operation log, when I seed AI summaries

    Scenario: As an admin, I should see a confirmation step and a logged reset result, when I click the reset button and confirm

    Scenario: As a guest or unauthorized user, I should be blocked from seed operations or redirected to login, when I open the admin page

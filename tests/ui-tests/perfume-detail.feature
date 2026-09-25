@ui @perfume-detail
Feature: Perfume detail page

    @smoke
    Scenario: As a user, I should see the perfume name, brand, image, score, votes, fragrance family and concentration, when I navigate to a valid perfume detail URL

    Scenario: As a user, I should see perfume notes and accords and navigate to the related search filter, when I inspect the notes section and click a note or accord

    Scenario: As a user, I should see longevity, sillage, season, time-of-day and available usage votes, when I inspect the performance section

    Scenario: As a user, I should see the perfume in the comparison basket, when I click the Karşılaştır button

    Scenario: As a guest, I should see a login link and disabled comment and rating controls, when I inspect the comments section

    Scenario: As a logged in user, I should see my comment and rating in the comment list, when I submit Kalıcılığı başarılı with four stars

    Scenario: As a user, I should see the main perfume image in a closable lightbox, when I click the perfume image

    Scenario: As a user, I should see the user photo and uploader name in a closable lightbox, when I click a user photo

    Scenario: As a user, I should see the AI summary of comments when it is available, when I open a perfume detail page

    Scenario: As a user, I should see a not-found or error state, when I navigate to an invalid perfume slug

    Scenario: As a user, I should see readable technical information without horizontal overflow, when I open the perfume detail page at 375 pixels

@ui @search
Feature: Detailed search

    @smoke
    Scenario: As a user, I should see perfumes matching sauvage and the query in the URL, when I submit sauvage in the search field

    Scenario: As a user, I should see results filtered by all selected filters, when I select gender, fragrance family and brand filters

    Scenario: As a user, I should see brand options matching afnan and refreshed results, when I search inside the Marka filter group

    Scenario: As a user, I should see the initial search results without active filters, when I click Tümünü Temizle

    Scenario: As a user, I should see higher-rated results and additional results appended, when I select En yüksek puan and click Daha Fazla Göster

    Scenario: As a guest, I should not be able to select Favorilerim, Yorum Yazdıklarım or Puanladıklarım filters, when I open detailed search

    Scenario: As a logged in user, I should see only my favorite perfumes, when I select the Favorilerim filter

    Scenario: As a user, I should see the sticky filter bar and expandable filter groups without horizontal overflow, when I open detailed search at 375 pixels

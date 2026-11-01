@compare
Feature: Perfume Comparison
    As a user of Aura Compare
    I want to see popular perfume comparisons

    Scenario: Retrieve popular perfume comparisons
        When I send a "GET" request to "Get Popular Comparisons" endpoint
        Then the response status should be 200 and should match "Get Popular Comparisons" response scheme

    Scenario: Retrieve AI comparison analysis
        When I send a "GET" request to "Get AI Comparison Analysis" endpoint
        Then the response status should be 200 and should match "Get AI Comparison Analysis" response scheme

    Scenario: Retrieve the preference votes of a comparison without logging in
        When I send a "GET" request to "Get Comparison Votes" endpoint
        Then the response status should be 200 and should match "Get Comparison Votes" response scheme

    Scenario: An anonymous visitor can vote, change the vote and take it back
        Given I have a new anonymous voter id
        When I send a "POST" request to "Cast Comparison Vote" endpoint with "Comparison Vote First Perfume" payload
        Then the response status should be 200 and should match "Get Comparison Votes" response scheme
        And the response body path "myVote" should be "dior-sauvage"
        When I send a "POST" request to "Cast Comparison Vote" endpoint with "Comparison Vote Second Perfume" payload
        Then the response body path "myVote" should be "versace-versace-pour-homme-dylan-blue"
        When I send a "POST" request to "Cast Comparison Vote" endpoint with "Comparison Vote Retract" payload
        Then the response status should be 200 and should match "Comparison Votes Without My Vote" response scheme

    Scenario: A vote without a visitor id or for a perfume outside the comparison is rejected
        When I send a "POST" request to "Cast Comparison Vote" endpoint with "Comparison Vote First Perfume" payload
        Then the response status should be 400
        Given I have a new anonymous voter id
        When I send a "POST" request to "Cast Comparison Vote" endpoint with "Comparison Vote Unrelated Perfume" payload
        Then the response status should be 400

    Scenario: A comparison comment with profanity is rejected
        Given I am authenticated
        When I send a "POST" request to "Submit Comparison Comment" endpoint with "Profane Comparison Comment" payload
        Then the response status should be 400
        And the response body should contain "uygunsuz ifadeler"

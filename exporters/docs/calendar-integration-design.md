# Google Calendar Exporter Module Outline

## Overview  
This document outlines how to build a **Google Calendar data exporter** analogous to the Todoist hierarchical exporter. The goal is to fetch calendars and events from Google Calendar and structure them similarly to Todoist projects and tasks. We cover relevant Google Calendar API capabilities (listing calendars, reading events, metadata fields, time zone handling, recurring events), map Google Calendar concepts to Todoist's data model, discuss authentication (OAuth2) considerations, and detail how to handle hierarchical data and recurring events. Finally, we provide an implementation prompt with steps and pseudocode for creating the exporter module.

## Google Calendar API Capabilities for Data Export

### Listing Calendars  
Google Calendar allows a user to maintain multiple calendars. The Calendar API’s `calendarList.list` method returns all calendars accessible by the user (the “calendar list”). Each calendar entry includes details such as a unique **calendar ID**, the **calendar name** (summary), and its **time zone**, among other properties ([CalendarList  |  Google Calendar  |  Google for Developers](https://developers.google.com/workspace/calendar/api/v3/reference/calendarList#resource#:~:text=,string)). For example, a calendarList entry (JSON) looks like:  

```json
{
  "kind": "calendar#calendarListEntry",
  "id": "user@example.com",
  "summary": "Personal",
  "timeZone": "America/New_York",
  ... 
}
```  

Key information for exporting:  
- **Calendar ID** – Identifier needed to query events on that calendar (e.g., an email address for primary calendar or a generated ID for others).  
- **Calendar Name (Summary)** – A human-friendly name, useful for grouping or labeling exported data by calendar.  
- **Calendar Time Zone** – The default time zone of the calendar ([CalendarList  |  Google Calendar  |  Google for Developers](https://developers.google.com/workspace/calendar/api/v3/reference/calendarList#resource#:~:text=,string)), which affects how event times are interpreted if no specific timezone is given for an event.  

Using the API: a GET request to `users/me/calendarList` returns an array of calendar entries ([CalendarList: list  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/v3/reference/calendarList/list#:~:text=%7B%20%22kind%22%3A%20%22calendar,)). The standard Calendar API scopes required for this (and reading events) are `https://www.googleapis.com/auth/calendar.readonly` for read-only access (or the more restrictive `calendar.calendarlist.readonly` just for listing calendars) ([CalendarList: list  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/v3/reference/calendarList/list#:~:text=Scope%20)). Proper OAuth credentials and consent are needed (discussed later). The **primary** calendar of a user can be referenced with the ID `"primary"` in API calls, as a shortcut for the user’s main calendar.

### Retrieving Events  
Once calendar IDs are obtained, events can be fetched using the `events.list` endpoint for each calendar. This returns the events (appointments) stored in that calendar. Important capabilities of `events.list` relevant to exporting data include:  

- **Retrieving all events or filtering by date range:** You can specify optional query parameters `timeMin` and `timeMax` to limit events to a given time window ([Events: list  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/v3/reference/events/list#:~:text=,timeMin)). This is useful if exporting events for a particular period (e.g., the current year or month) to avoid retrieving an unbounded set of events. If omitted, all events in the calendar are returned (which could be a lot, so filtering or incremental export should be considered for performance).  
- **Pagination:** The API returns results in pages (by default up to 250 events per page, configurable via `maxResults`). A `nextPageToken` is provided if more results remain. The exporter implementation should check for and handle pagination, looping until all pages are fetched.  
- **Event ordering:** By default, events are returned in an arbitrary order (or ordered by last update if using sync tokens). If `timeMin` is used with `singleEvents=true` (see next point), you can also set `orderBy=startTime` to get events chronologically.  
- **Recurring events expansion (`singleEvents`):** A crucial parameter for exporting is `singleEvents`. By default, a recurring series is returned as a single event with a recurrence rule, and not all individual occurrences are listed. If you set `singleEvents=true` in the query, the API will **expand recurring events into individual instances**, returning each occurrence as if it were a separate event (and not return the parent recurring event itself) ([Events: list  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/v3/reference/events/list#:~:text=,to%20False)). In this mode, each event in the results is either a one-time event or one instance of a recurring event series, each with its own start/end times. If `singleEvents=false` (the default), you will get the recurring event “series” entry (with its recurrence rules in the `recurrence` field) and any *exceptions* or overridden instances as separate events. We will discuss below how to choose between these modes for the exporter.  
- **Including canceled events:** By default, events with status `"cancelled"` (including cancelled occurrences of a recurring series) are not returned. If the use-case requires exporting event cancellations or deleted events, the `showDeleted=true` parameter can include those (they will have `status:"cancelled"` in the results) ([Events: list  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/v3/reference/events/list#:~:text=,recurring%20events%20into%20instances%20and)). Typically for an exporter of current calendar data, you might skip cancelled events unless you specifically want to track deletions.  

Using the API in practice, an HTTP GET request might look like:  

```
GET https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events?timeMin=2025-01-01T00:00:00Z&timeMax=2025-12-31T23:59:59Z&singleEvents=true&orderBy=startTime
Authorization: Bearer <OAuth2 Access Token>
```  

This would retrieve all instances of events in the specified calendar for the year 2025, expanded if they are recurring, sorted by start time. In code (using Google’s Python client as an example), it would be: 

```python
events_result = service.events().list(
    calendarId=calendar_id, 
    timeMin='2025-01-01T00:00:00Z',
    timeMax='2025-12-31T23:59:59Z',
    singleEvents=True,
    orderBy='startTime'
).execute()

events = events_result.get('items', [])
```  

The result is a JSON structure containing an array of events under `items`. Pagination handling would involve checking for `nextPageToken` in the response and iterating as needed.  

### Event Data and Metadata  
Each **Event** resource in Google Calendar contains a rich set of metadata. The exporter will primarily focus on fields analogous to those captured for tasks in Todoist. Important event fields include:  

- **Summary (Title):** A short title or name of the event ([Events  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/v3/reference/events#:~:text=,string)), similar to a task’s name. (In the API JSON, this is the `summary` field.)  
- **Description:** A longer description or notes for the event ([Events  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/v3/reference/events#:~:text=,string)). This can be multiline text (even HTML) describing details of the event. This maps to the description or note of a task.  
- **Location:** Free-form text for location of the event ([Events  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/v3/reference/events#:~:text=,string)) (if applicable). Todoist tasks don’t have a dedicated location, so this might be extra info not present in Todoist data.  
- **Start and End times:** The start and end of the event. These are given as a nested object `start` and `end`, each of which may contain either a `dateTime` (exact timestamp with date and time) or a `date` (all-day event) and an optional `timeZone` ([Events  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/v3/reference/events#:~:text=,string)). For export, we need to capture the date/time of events. If the event is an all-day event, the `date` field will be present (in "YYYY-MM-DD" format) and no time of day. If it’s a timed event, `dateTime` will be used (in RFC3339 timestamp format) and possibly a `timeZone` field if the time zone is specified or differs from the calendar’s default.  
- **Recurring event info:** If an event is recurring, the parent event entry will have a `recurrence` field which is an array of recurrence rule strings (RRULE/RDATE/EXDATE) ([Events  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/v3/reference/events#:~:text=,datetime)). For instance, an event that repeats every week might have `recurrence: ["RRULE:FREQ=WEEKLY;BYDAY=MO"]`. Also, an occurrence or exception of a recurring series will have a `recurringEventId` linking it to the parent series, and an `originalStartTime` indicating the scheduled start of that occurrence in the series ([Recurring events  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/guides/recurringevents#:~:text=The%20following%20event%20fields%20are,specific%20to%20instances)). These are important if we need to reconstruct how recurring events break down into instances or to group them.  
- **Time zone**: Each event’s times may carry an explicit time zone. If present, it indicates that the start/end are in that specific zone (e.g., `"timeZone": "Europe/Zurich"` in the start field) ([Calendars & events  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/concepts/events-calendars#:~:text=Event%20instances%20have%20a%20start,all%20specify%20the%20same%20time)). If not present, the event times are interpreted in the calendar’s default time zone. The raw event data will include whatever was set. For consistency in export, we might convert times to a standard time zone or keep the original values along with their time zone info.  
- **Status:** Indicates if the event is confirmed, tentative, or cancelled. Confirmed vs tentative might not be crucial for a basic export (tentative is like a placeholder event). Cancelled events, if retrieved (via `showDeleted`), will have `status: "cancelled"` and usually no start/end (just an ID and maybe recurrence info to indicate a cancellation of a recurring instance) ([Events: list  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/v3/reference/events/list#:~:text=,recurring%20events%20into%20instances%20and)). Typically, we might exclude these from normal export unless needed for completeness or historical tracking.  
- **Attendees:** List of attendees for the event (emails, response status, etc). For a personal planning data export, this might be beyond scope, but it’s available in the `attendees` field if needed ([Events  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/v3/reference/events#:~:text=,boolean)). Todoist tasks have “collaborators” or “assignees” which could conceptually map to attendees (if one wanted to capture shared events vs personal tasks). In a basic exporter, we might omit attendees unless specifically needed.  
- **Metadata like Creation/Update timestamps:** `created` and `updated` fields (timestamps) show when the event was created and last modified ([Events  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/v3/reference/events#:~:text=,Optional)) ([Events  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/v3/reference/events#:~:text=,For%20a%20recurring)). Todoist tasks have similar (date added, date completed, etc.). If the exporter or its data consumers care about when events were last changed (for sync or audit), we might capture `updated`. Otherwise, it can be omitted.  
- **Other fields:** There are additional fields such as `colorId` (if the event is color-coded), `reminders` (custom reminders set), `transparency` (free/busy indication), etc. These are generally not present in Todoist tasks, so unless needed for a specific purpose, the exporter might ignore them. Extended properties (custom key–value pairs on events) could be used to store custom data; Todoist has labels and comments instead. We likely won’t use extended properties in a read-only exporter, but be aware they exist (private and shared extended properties) ([Events  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/v3/reference/events#:~:text=%7D%20%5D%2C%20,%7B%20%28key%29%3A%20string)).  

**Output Tip:** When exporting, ensure to structure the event data with these relevant fields. For example, each event could be represented as an object or dictionary with keys like `"title"`, `"description"`, `"start_time"`, `"end_time"`, `"all_day" (bool)`, `"recurrence_rule"`, `"calendar_name"`, etc., depending on the output format (JSON, CSV, etc.). We will discuss the hierarchical grouping in a later section.

### Time Zones and Date/Time Handling  
Handling time zones is critical when exporting calendar data, to ensure that event times are interpreted correctly. Google Calendar API uses **IANA time zone identifiers** (e.g., "America/Los_Angeles", "Europe/Zurich") for specifying time zones ([Calendars & events  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/concepts/events-calendars#:~:text=A%20time%20zone%20specifies%20a,using%20IANA%20time%20zone%20identifiers)). Both calendars and events have associated time zone information:  

- Each calendar has a default time zone (as noted in the calendarList entry). This is used as the default for events on that calendar when the event’s own time zone is not specified. It also serves as the default output zone for API queries if you don’t request a specific zone.  
- Event times can be given with a time zone. An event could start in one time zone and end in another (Google Calendar UI allows specifying separate time zones for start/end if needed, say for travel spanning zones) ([Calendars & events  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/concepts/events-calendars#:~:text=Event%20instances%20have%20a%20start,all%20specify%20the%20same%20time)) ([Calendars & events  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/concepts/events-calendars#:~:text=Image%3A%20Screenshot%20fragment%20showing%20time,zone%20on%20an%20event)), but typically events have one associated zone or default to calendar’s zone.  
- The Calendar API allows the client to specify a `timeZone` parameter in the `events.list` request. This dictates the time zone of the values returned in the `start`/`end` dateTime fields of each event ([Calendars & events  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/concepts/events-calendars#:~:text=values%20are%20interpreted%20or%20presented,instances%28%29%20methods)). For example, if you set `timeZone=UTC`, all event dateTimes in the response will be converted to UTC. If you omit this parameter, the API returns dateTimes in each event’s local time (as stored, or defaulting to the calendar’s time zone) ([Calendars & events  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/concepts/events-calendars#:~:text=values%20are%20interpreted%20or%20presented,instances%28%29%20methods)). For consistency in an export, you might choose to request all data in UTC or in the user’s local zone, or simply handle each event’s time zone individually as provided.  

When building the exporter, consider:  
- **Consistent Format:** It’s often easiest to convert all times to ISO 8601 strings with a UTC offset (which is basically what the API returns). We might keep the `dateTime` string as given by the API, which includes offset, or normalize to Z (Zulu / UTC). Alternatively, maintain the local times and include the time zone ID for clarity.  
- **All-day events:** All-day events come as date-only (no time) and no timezone. These should be treated differently in output (e.g., a flag or storing them as date with an indication of all-day). In Todoist, a task due on a date with no specific time is akin to an all-day event.  
- **Cross-timezone events:** If an event spans time zones, Google ensures a single time zone is attached to a recurring series for expansion consistency ([Calendars & events  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/concepts/events-calendars#:~:text=Recurring%20event%20time%20zone)). For non-recurring, if start and end have different zones, it’s usually handled by converting one of them internally. Such cases are rare and may appear as two different offsets in start/end. The exporter can simply take the strings as-is.  
- **Calendar’s default zone in output grouping:** If we group events by calendar, it might be useful to note the calendar’s time zone in the exported data (for context), especially if not converting all times to a common zone.  

In summary, use IANA zone IDs and ISO timestamps, and document in the output whether times are in local or UTC. The API’s use of IANA IDs ensures consistency with standard tz databases ([Calendars & events  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/concepts/events-calendars#:~:text=A%20time%20zone%20specifies%20a,using%20IANA%20time%20zone%20identifiers)). For example, an event might be output as `"2025-07-01T09:00:00-04:00"` for Eastern Time with DST offset, or as `"2025-07-01T13:00:00Z"` in UTC – both represent the same instant, just different representations.

### Recurring Events and Recurrence Rules  
Recurring events are a complex but important aspect of calendar data. Google Calendar supports recurring (repeating) events using recurrence rules defined by the iCalendar specification (RFC 5545). Here’s how recurring events are represented and what to consider for export:  

- **Recurrence Rules (RRULE):** In the event resource, the `recurrence` field is an array of strings. Typically this will include an **RRULE** string that defines the pattern (and optionally RDATE/EXDATE for additional included or excluded dates) ([Calendars & events  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/concepts/events-calendars#:~:text=The%20recurrence%20field%20contains%20an,as%20defined%20in%20RFC%205545)). For example, an event that repeats every Friday for 5 occurrences might have: `recurrence: ["RRULE:FREQ=WEEKLY;COUNT=5;BYDAY=FR"]`. Another example: daily every 3 days with an end date might be `RRULE:FREQ=DAILY;INTERVAL=3;UNTIL=20251231T235959Z`. These rules cover frequency (daily, weekly, monthly, etc.), interval, end conditions (until date or count), and by-day or by-month specifics ([Calendars & events  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/concepts/events-calendars#:~:text=The%20,Some%20of%20them%20are)) ([Calendars & events  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/concepts/events-calendars#:~:text=You%20can%20use%20either%20COUNT,inclusive)). The API essentially stores and returns the recurrence rule in this textual form. If exporting, you might include this raw string or translate it into a more human-readable form (though storing the RRULE text is often sufficient for interoperability).  
- **Recurrence Expansion:** As mentioned, by default the API returns the recurring series as one item with the RRULE. If you use `singleEvents=true`, you won’t directly see the RRULE in the returned events (because it only returns instances); instead, each instance will have `recurringEventId` referencing the parent and an `originalStartTime`. To get the rule in that case, you’d have to fetch the parent series event specifically. For an exporter, you have two possible approaches:  
  - **Export each recurring series as a single entry** (like Todoist would have one task with a recurring schedule). In this approach, you would call `events.list` with `singleEvents=false` (default) and collect the events. Each recurring series will appear once, containing the recurrence rule. You may also get exception events: for example, if one occurrence has a different time or was canceled, it will show up as a distinct event with a `recurringEventId`. You’d then need to decide how to represent these exceptions (maybe nested under the main series in the exported structure or listed with a note).  
  - **Export each event occurrence separately**. In this approach, use `singleEvents=true` and perhaps a date range, and list every event instance. This is akin to a fully “expanded” calendar view. The recurring nature would be implied by events sharing a `recurringEventId` or the same title pattern, but you wouldn’t explicitly output the recurrence rule. This is useful for timeline or schedule exports where each occurrence is treated like an individual entry (similar to tasks that are generated for each occurrence of a recurring Todoist task).  

- **Recurring Tasks vs Events:** In Todoist, a recurring task is typically a single task with a due date that moves after completion (only one instance exists at a time). In Google Calendar, recurring events exist as a series from the start – all future instances are conceptually present (and can be listed). If mapping to Todoist, a Google recurring event series is most analogous to a Todoist task with a recurrence pattern. Therefore, if we want a similar structure, we might export a recurring event as one item with a recurrence rule (rather than duplicating it many times). However, if the purpose is to have every occurrence (say for time tracking or for a timeline), expansion is needed. The choice depends on use-case. For consistency with a “hierarchical” approach, treating the recurring series as the parent item (with perhaps child entries or notes for exceptions) might make sense.  

- **Exceptions and modifications:** Google Calendar allows modifying single instances of a recurring series or canceling individual occurrences. These appear in the data as separate events with the same `recurringEventId` and an `originalStartTime` that corresponds to the scheduled time of that instance ([Recurring events  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/guides/recurringevents#:~:text=The%20following%20event%20fields%20are,specific%20to%20instances)). For example, if a meeting is usually 9am every day but on one particular day it was moved to 10am, that day’s event would appear with `recurringEventId` linking to the series and its own start/end at 10am. If an occurrence is deleted, it appears as an event with `status: "cancelled"` and the recurringEventId (if you include deleted events). Handling this in export: if exporting the series as one item, you might need to list the exception details (e.g., “on 2025-07-04, time changed to 10am” or that it was canceled). If exporting all instances, the exceptions are naturally included as their own events with their updated info.  

- **All-day recurring events:** These have `date` in recurrence rules (and RRULE with FREQ, etc., just as with timed events). Just note to treat them as all-day in output.  

In summary, the Calendar API provides the data needed to fully understand recurring events. The exporter should decide on one of two strategies: keep recurring events as single entries with recurrence info (plus handle exceptions), or flatten them. Both approaches require careful use of the API parameters. For a hierarchical exporter similar to Todoist’s, it might be more logical to treat each recurring series as one entity (like a recurring task) and incorporate any overrides as part of that entity’s data.

## Mapping Google Calendar and Todoist Data Structures

To build the Google Calendar module in a way that feels familiar next to the Todoist exporter, we should map equivalent concepts between Todoist (a task management system) and Google Calendar (a scheduling system):

- **Projects (Todoist) vs. Calendars (Google Calendar):** In Todoist, *projects* are top-level containers holding tasks (and can be hierarchical). In Google Calendar, each *calendar* is a container holding events. We can treat each calendar analogous to a project. For example, a “Work” project in Todoist might correspond to a “Work” calendar in Google. In the export, events from each calendar would be grouped under that calendar’s name, similar to tasks grouped by project. (Google Calendar doesn’t have nested calendars the way Todoist can have sub-projects, so our hierarchy for calendars is only one level).  

- **Sections (Todoist) vs. *No direct equivalent*:** Todoist projects can have sections to subgroup tasks. Google Calendar has no concept of sections within a calendar. All events are in one flat list in each calendar (though you could conceptually group by month/week if needed when presenting, but that’s not a data attribute, just a time attribute). We will not have an equivalent for sections; all events in a calendar are treated uniformly.  

- **Tasks (Todoist) vs. Events (Google Calendar):** A Todoist task corresponds to a Google Calendar event. Both represent an item that you plan to do (task) or attend (event). Key fields align as follows:  
  - *Title:* Todoist task content ↦ Event summary/title.  
  - *Description/Comments:* Todoist task description or comments ↦ Event description (notes).  
  - *Due Date/Time:* Todoist due date/time ↦ Event start (and end) time. If a Todoist task has just a due date (no specific time), that’s like an all-day event. If it has a due datetime, that maps to an event start time (with perhaps a default duration or end time — since tasks don’t specify end time, we might decide on a convention, e.g., treat it as a zero-duration event or a fixed duration like 1 hour for mapping purposes). For exporting Google Calendar, we don’t need to do that conversion; we just take events’ start and end as they are. But if comparing the concept: tasks have one date/time (when it’s due), events have a start and end (when it begins and ends).  
  - *Priority:* Todoist task priority (1-4) ↦ (No direct equivalent in Google Calendar). Google events don’t have a priority field. We might ignore this mapping or perhaps use event color to indicate priority if one wanted to, but by default there’s no priority on events.  
  - *Labels:* Todoist allows labels/tags on tasks. Google Calendar events don’t have a built-in label/tag system. You could use the `extendedProperties` of events to store tags, but typically an event doesn’t have multiple tags, just maybe a color category. We will likely not have an analog for labels in the basic exporter. (If needed, one could map specific calendar names or event colors to what were labels, but that’s a stretch).  
  - *Completed status:* Todoist tasks can be marked complete and then they are archived or checked off. Google Calendar events aren’t “completed” – they just occur. There is no completion toggle. The closest is that events can be in the past or future, or cancelled. So if comparing, a completed task is somewhat like a past event that happened, but we typically don’t mark it explicitly. Thus, our export doesn’t need to mark events as done/undone. (We could optionally indicate if an event’s end time is in the past vs future at time of export, but that’s temporal information rather than a stored field).  
  - *Assigned person:* In Todoist, a task can be assigned to someone. In Google Calendar, an event can have attendees including an organizer. If using a single user’s calendar data, the concept of assignment isn’t directly applicable, unless we interpret the creator/organizer or specific attendee as analogous. For simplicity, we treat each event as “yours” (the user’s perspective) since we are exporting the user’s calendars.  

- **Sub-tasks (Todoist) vs. Event hierarchy (Google Calendar):** Todoist supports nested tasks (task with sub-tasks). Google Calendar does not support an event-subevent structure. All events in a calendar are independent. The only form of hierarchy in calendar is recurring series (one could view the series as a parent and the occurrences as children). If we choose to represent recurring series with sub-items (occurrences), that would introduce a two-level hierarchy: recurring event → instances. This is a *conceptual* mapping: a recurring Todoist task (e.g., "backup files every Friday") is represented as one task with a recurrence property, whereas in Calendar it might be one event with recurrence rules and multiple date instances. If we want to mirror the Todoist export style, we might **not** list every instance as sub-tasks; instead, we treat the recurring event similar to a single recurring task (just noting its rule). However, we have the freedom to output instances as subentries if desired (more on this in the hierarchy section). Aside from recurrence, there’s no direct sub-event concept to map. So, generally, tasks hierarchy doesn’t translate to events except in this recurring context.  

- **Projects/Calendars hierarchy:** Todoist can nest projects (a project can have a parent project). Google Calendars have no parent-child relationships; they are all top-level in a user’s account. Thus, our exporter will list calendars separately (likely as separate sections or JSON objects), without any nesting of calendars.  

In summary, **each Google Calendar = one task project**; **each Calendar Event = one task**. The **recurrence rule on an event = a recurring task schedule**. We will group output by calendar (to mimic projects) and within that, list events (mimicking tasks, possibly with sub-entries for recurring instances if needed). By understanding this mapping, we can make the Google Calendar exporter’s output feel consistent alongside Todoist’s data in a unified view.

## Authentication and Authorization (OAuth 2.0)  
Accessing the Google Calendar API requires authenticating as a Google user and authorizing the application to read their calendar data. The exporter module will need to handle OAuth2 flow and maintain the credentials. Key considerations include:

- **Google API Credentials:** You will need to create a Google Cloud Project and OAuth 2.0 Client IDs (e.g., for a desktop app or web app) through the Google Cloud Console. This provides a Client ID and Secret which your module will use to initiate OAuth. For an open-source module, you might instruct users to supply their own credentials, or distribute with your own (though distributing secrets in open source is not recommended). The OAuth consent screen must be configured to request access to Calendar data.  

- **Scopes:** Google Calendar API has specific OAuth scopes that determine what level of access is granted. For read-only export, use the **least privileged scope** that accomplishes the task. Two scopes are relevant:  
  - `https://www.googleapis.com/auth/calendar.readonly` – read access to **all** calendar information (includes both event data and the list of calendars) ([CalendarList: list  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/v3/reference/calendarList/list#:~:text=Scope%20)).  
  - `https://www.googleapis.com/auth/calendar.events.readonly` – read access to events only (no access to calendar settings or list). If you only use `calendar.events.readonly`, you might not be able to list all calendars via `calendarList.list` unless you know their IDs. However, you likely do want to list calendars to mirror the Todoist projects concept. Therefore, `calendar.readonly` is a convenient broad scope.  
  - (There are also `.../auth/calendar.calendarlist.readonly` and other granular scopes ([CalendarList: list  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/v3/reference/calendarList/list#:~:text=Scope%20)). For simplicity, `calendar.readonly` covers both calendars and events in one go.)  

  Using the broader read-only scope is acceptable for an exporter. If, however, we wanted to strictly minimize, we could combine `calendar.events.readonly` and `calendar.calendarlist.readonly` to achieve a similar effect. In either case, the user will be asked to consent to read their calendar data. The scopes will be listed on the consent screen. (It’s worth noting that `calendar.readonly` includes the ability to see all event details on the user’s calendars, while a scope like `.../auth/calendar.freebusy` would only show free/busy times. Since we need full details, read-only is needed.)  

- **OAuth Flow:** Typically, an installed application or script would use the OAuth “installed app” flow. For example, using the Google API client library, you might redirect the user to a Google URL where they log in and approve access, then the service returns an authorization code which your app exchanges for tokens. In a console environment, this might involve popping open a browser or providing a link for the user to visit. For a server-side module, you might use a service account (not ideal for user-specific data unless domain-wide delegation is set up) or expect the user to provide a token. Most likely, as an open-source tool, we either use an out-of-band OAuth process (user pastes in a code) or guide them through a local server redirect.  

- **Refresh Tokens:** After initial authorization, the app receives an **access token** (valid short-term) and a **refresh token** (long-lived, if offline access was requested). Make sure to request **offline access** in the OAuth consent (this is usually automatic for installed apps). The refresh token can be stored (securely) so that subsequent runs of the exporter can refresh the access token without user intervention. The module should handle token refresh when needed (the Google client libraries do this automatically).  

- **Token Storage:** In practice, one might store the tokens in a file (e.g., `tokens.json`) in the user’s config directory. The Todoist exporter likely stored the Todoist API token or used OAuth as well. For Google, ensure the storage is secure (file permissions) and document how a user can revoke/regenerate if needed.  

- **Using Client Libraries vs HTTP:** Google provides client libraries in many languages (Python, JavaScript, etc.) which handle a lot of OAuth and API calling boilerplate. For example, in Python, you’d use `google-auth` and `google-api-python-client` to manage OAuth and build a service object for Calendar API. In a small module, you could also manually make HTTPS requests with an `Authorization: Bearer <token>` header. Using the library can simplify fetching paginated results and such, but introduces a dependency. It’s up to the context of the project. In pseudocode examples below, we’ll assume using the Python client for brevity, but the logic is similar in any environment (get token, call endpoints, parse JSON).  

- **Scopes and API Enablement:** Remember to enable the Google Calendar API in the Google Cloud project associated with your OAuth credentials; otherwise requests will be blocked. This is usually done via the API Library in Google Cloud Console by enabling “Google Calendar API”.  

**Example OAuth Setup (Python pseudocode):**  
```python
from google_auth_oauthlib.flow import InstalledAppFlow

# Scopes for read-only access
SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']

# Create flow and run local server to get credentials
flow = InstalledAppFlow.from_client_secrets_file('client_secret.json', SCOPES)
creds = flow.run_local_server(port=0)  # opens browser for user login

# creds now contains access and refresh tokens
```  
This will handle getting user consent. In a non-interactive environment, other methods (like providing a previously obtained refresh token or using a service account with delegated domain authority) would be needed, but for a typical user-driven export, the above is fine.  

Once authenticated, you construct the Calendar service and proceed to data retrieval:  
```python
from googleapiclient.discovery import build
service = build('calendar', 'v3', credentials=creds)
calendar_list = service.calendarList().list().execute()
```  
Now you have the connection to call `events().list()` etc.  

- **Authorization Persistence:** Ensure the module caches the credentials (for example, saving `creds` to a file after first run) so that the user is not asked to log in every time. Google’s OAuth tokens (refresh tokens) can be reused until revoked or expired. Provide instructions in the open-source project README on how to set up the Google API credentials and any necessary configuration (like redirect URIs for installed apps, which can usually be `urn:ietf:wg:oauth:2.0:oob` or `http://localhost:PORT` for local server flows).  

- **Security:** Advise users to treat their client secrets and tokens carefully. In open source, if distributing a command-line tool, you might include a sample config and ask the user to plug in their own secret to avoid publishing yours.  

In summary, implementing OAuth2 for Google Calendar involves a one-time user consent to the calendar scope, then using the granted token to call the Calendar API. The module should make this as seamless as possible (perhaps by opening a browser or providing clear prompts) and store the resulting credentials for future use.

## Handling Hierarchical Data and Recurring Events in Export

One of the challenges is structuring the exported calendar data in a hierarchical or logical way, especially given differences between tasks and events. Here’s how we can approach it:

### Data Hierarchy in Export  
We aim to produce a **hierarchical JSON or object structure** similar to the Todoist exporter. In the Todoist hierarchical export, the data is likely structured as projects containing tasks (with subtasks nested). For Google Calendar, the natural hierarchy will be **Calendars → Events**:  

- **Top level: Calendars.** The exported data can be a dictionary or map where each key is a calendar name (or ID) and the value is a list of events. For example:  
```json
{
  "Personal": [ ... events ... ],
  "Work": [ ... events ... ],
  "Holidays": [ ... events ... ]
}
```  
This is analogous to Todoist’s projects grouping tasks. Each calendar’s events list can be sorted by start time or any other criteria. Including the calendar’s ID or other metadata is optional, but name is usually sufficient as an identifier (assuming names are unique enough; if not, perhaps use `name (id)`).  

- **Event entries:** Each event in those lists can be an object containing its relevant fields (title, start, end, etc). Because events in Google Calendar don’t nest, initially this would be a flat list for each calendar. The only reason to introduce a nested structure under events is to handle recurring series in a hierarchical manner, which we discuss next.

### Representing Recurring Events  
If we want to maintain some hierarchy akin to tasks and subtasks, we could treat a recurring event series as a “parent” and its individual occurrences (especially exceptions) as “children”. There are a couple of ways to handle recurring events in the exported structure:

**Option 1: Flat list (no sub-hierarchy)** – Treat each event occurrence as an independent entry. This is straightforward: if `singleEvents=true` was used, just output each event in the list as its own entry. If an event has an RRULE, we might simply include the RRULE string in that event’s data (which represents the entire series). However, when using singleEvents mode, the recurring series’ RRULE isn’t directly available per instance (you’d have to fetch it). So more likely: in this flat approach, we would use `singleEvents=false` and output each “master” event (with its recurrence rule) as one entry. This means one entry representing the whole series. But then what about exceptions? Possibly we could ignore exceptions or list them as separate entries for modifications. This gets tricky to interpret.  

**Option 2: Nested structure for recurring series** – Provide a structure where a recurring event series is one object that contains either a list of its occurrences or at least details of its recurrence. For example:  
```json
"Work": [
  {
    "title": "Team Meeting",
    "start_time": "2025-06-01T10:00:00-04:00",
    "end_time": "2025-06-01T11:00:00-04:00",
    "recurrence": "RRULE:FREQ=WEEKLY;BYDAY=MO",
    "occurrences": [
       { "date": "2025-06-01", "status": "occurred" },
       { "date": "2025-06-08", "status": "cancelled" },
       { "date": "2025-06-15", "status": "occurred", "notes": "Rescheduled to 1pm" }
    ]
  },
  { "title": "One-off Event", ... }
]
```  
This example shows a nested structure where the recurring event “Team Meeting” lists its recurrence rule and then perhaps a summary of each occurrence (with any that were cancelled or rescheduled noted). This kind of output is more complex but provides a clear hierarchy: the series as a parent (like a task) and instances as children (like sub-tasks). This fits the “hierarchical exporter” idea well. However, it may be more detail than necessary for some uses. Another simpler approach is: list the series as one entry with the RRULE, and still list each occurrence as a normal event in chronological order (maybe duplicate info). That could lead to duplication in output, which might not be ideal.

**Option 3: Only series, no occurrences** – If the purpose is more like Todoist (which doesn’t list every upcoming occurrence of a recurring task, just the task itself with a recurrence pattern), we might export just the base recurring event with its rule, and skip listing all future instances. This gives a concise representation but loses details of specific instance changes or the exact dates of each occurrence. It depends on what the end-user of the export needs. If it’s for backup or for feeding into another system that understands RRULEs, this is fine. If it’s for a human-readable report of all events, it’s not sufficient.

For completeness, the exporter could also offer a mode or clearly document how it handles recurring events. For the first iteration, a reasonable plan is: **treat each recurring series as a single entry** (like a recurring task) and include the recurrence rule text and any known exceptions. This keeps the data size smaller and structure simpler, at the expense of granularity. If needed, a user could then separately expand those via tools or by looking at the rule.

### Preserving Hierarchy vs Flattening  
**Hierarchical Data Consideration:** Todoist’s hierarchical exporter likely outputs nested JSON (project contains tasks, task contains subtasks). For Google Calendar: we have decided calendar contains events; if needed, event contains sub-events (occurrences). Beyond that, there isn’t another level. This two-level hierarchy is simpler than Todoist’s (which can be 3-4 levels deep with sub-projects, sections, subtasks). This simplicity means we might not need recursion in code beyond one level of grouping.

**Sorting and Ordering:** In a calendar, order is usually chronological. In Todoist, tasks might be sorted by project order or priority. For events, it makes sense to sort them by start time in the export. We can sort each calendar’s event list by the start dateTime (or date for all-day). If mixing recurring series (with no single date) and one-time events, those series could be listed by their first occurrence or next occurrence. Alternatively, list all events by start date (which naturally intermixes series instances). But if we list by chronology and we treat a recurring series as one item at its first occurrence date, future one-time events might appear before some occurrences of the series in time. This is a tricky representation issue. If the export is primarily for structural data rather than an exact timeline, it might be acceptable that a weekly meeting appears once at the top (with rule) and then other events fill in.

Another approach: we could duplicate recurring events in two forms: one as a parent (with rule) and also list each occurrence as separate entries in the timeline order. That might complicate the structure or lead to confusion. So it’s better to choose either series-centric or timeline-centric output.

**Recommendation:** For now, output a **series as one item**. If needed, an advanced option can later output a fully expanded list for timeline use. This aligns with how Todoist’s recurring tasks are single items with a due string like "every Monday". We’ll do analogous: one entry with `"recurrence": "RRULE:..."`. We will still list non-recurring events as normal. If an event has a recurrence rule, that tells the consumer it’s recurring. If we detect exceptions (like an event with a `recurringEventId` that is an override), we can attach that info or list that as a note under that series.

### Example JSON structure (conceptual)  
To illustrate, here’s a conceptual snippet of how the exported data might look as JSON, combining all the above ideas:

```json
{
  "Work": [
    {
      "id": "123abc...",
      "title": "Daily Standup",
      "description": "",
      "start": "2025-09-01T09:00:00-04:00",
      "end": "2025-09-01T09:15:00-04:00",
      "recurrence": "RRULE:FREQ=DAILY;INTERVAL=1",
      "timeZone": "America/New_York",
      "recurring_exceptions": [
        {
          "date": "2025-09-10",
          "status": "cancelled"
        }
      ]
    },
    {
      "id": "nonrecurring1",
      "title": "Project Kickoff",
      "description": "Initial meeting with client.",
      "start": "2025-09-05T10:00:00-04:00",
      "end": "2025-09-05T11:00:00-04:00",
      "timeZone": "America/New_York",
      "recurrence": null
    }
  ],
  "Personal": [
    {
      "id": "birthdayEventId",
      "title": "Mom's Birthday",
      "start": "2025-07-20",
      "end": "2025-07-21",
      "allDay": true,
      "recurrence": "RRULE:FREQ=YEARLY"
    },
    ...
  ]
}
```

In this hypothetical output:  
- “Daily Standup” is a recurring event (every day) listed once with its recurrence rule. It also has an exceptions list noting that on 2025-09-10 it was canceled (perhaps pulled from a cancelled instance in the data).  
- “Project Kickoff” is a normal one-time event.  
- In "Personal", a birthday is shown as an all-day event (start date and end date which is next day exclusive) with a yearly recurrence rule.  

This structure is hierarchical by calendars, and semi-hierarchical for recurring events (exceptions nested). It should be documented clearly in the module’s README so users know how to interpret it.  

When not dealing with exceptions, you might omit the `recurring_exceptions` field or have it empty. If you decide not to nest exceptions at all, you might instead list “cancelled” events in the same list with a flag. But since the question is about hierarchical structure, nesting them as shown keeps the series self-contained.

## Implementation Plan (Prompt for Building the Exporter Module)

With the above understanding, we can outline the steps to implement the Google Calendar exporter module. This serves as a prompt or guide for writing the actual code.

**1. Setup and Authentication:**  
   - Install and import the Google API client library (if using one) or prepare an HTTP client for REST calls.  
   - Handle OAuth2: Load client credentials, run the auth flow to get an access token (and refresh token). Ensure the scope is set to `calendar.readonly` (and request offline access).  
   - Store the obtained credentials for reuse. (In code, this might mean saving to a file and loading on subsequent runs to avoid re-authentication.)  

   *Pseudocode:*  
   ```python
   creds = load_stored_credentials()
   if not creds or creds.expired:
       creds = authenticate_via_oauth(CLIENT_ID, CLIENT_SECRET, scope='calendar.readonly')
       save_credentials(creds)
   service = build_service('calendar', 'v3', creds)
   ```  

**2. Retrieve Calendar List:**  
   - Call the Calendar API to get the list of calendars (`calendarList.list`).  
   - Iterate through the returned calendars. For each calendar, collect its `id` and `summary` (name). You might skip calendars that the user doesn’t want to export (maybe only specific ones), but generally include all that are not “read-only” or not accessible. The `accessRole` in the calendar list entry can tell if the user has reader or owner access ([CalendarList  |  Google Calendar  |  Google for Developers](https://developers.google.com/workspace/calendar/api/v3/reference/calendarList#resource#:~:text=Property%20name%20Value%20Description%20Notes,only.%20Possible%20values%20are)) – for export, even read access is fine.  
   - Consider filtering out calendars like “Contacts” or “Holidays” if the user doesn’t consider those part of their planning data (or make it an option). The Todoist exporter likely exported all projects, so by analogy we export all calendars by default.  

   *Pseudocode:*  
   ```python
   calendar_list = service.calendarList().list().execute()
   calendars = calendar_list.get('items', [])
   for cal in calendars:
       cal_id = cal['id']
       cal_name = cal.get('summary', cal_id)
       init_output_for_calendar(cal_name)
   ```  

**3. Fetch Events for Each Calendar:**  
   - For each calendar ID, call `events.list`. Decide if you want all events or a specific range. A typical approach is to export everything (no timeMin/timeMax) to have a full data export. This could include past and future events. Alternatively, you might take a range (like from the current date onward for future planning). For a complete exporter, loop through all pages until all events are retrieved.  
   - Important: use appropriate parameters: If outputting recurring series as single items, call `events.list(calendarId=..., singleEvents=False, showDeleted=False)` to get the recurring events (with RRULEs) and exceptions. If outputting every instance, call with `singleEvents=True` (and maybe a time range to avoid infinite future occurrences).  
   - We may prefer `singleEvents=False` to get the full definition of each recurring series. This will give us: one item per recurring series (with recurrence rules), one item per *exception or override*, and one item per purely one-time event. In the results, you can distinguish exceptions because they have `recurringEventId` and usually no recurrence field of their own.  
   - Sort the events as needed. The API might not return them sorted by start time when `singleEvents=false`. You could sort the list by start time manually (taking care of all-day events which have date instead of dateTime). If using `singleEvents=true` and `orderBy=startTime`, they’re already sorted. With series (not expanded), sorting by the series’ first occurrence start time might be useful. You can find that in the `start` of the event (for a recurring series, start = first instance start).  

   *Pseudocode:* (assuming non-expanded approach)  
   ```python
   events_result = service.events().list(calendarId=cal_id, singleEvents=False, showDeleted=True).execute()
   events = events_result.get('items', [])
   # handle pagination
   while 'nextPageToken' in events_result:
       events_result = service.events().list(calendarId=cal_id, pageToken=events_result['nextPageToken'], singleEvents=False, showDeleted=True).execute()
       events.extend(events_result.get('items', []))
   # sort events by start time (if desired)
   events.sort(key=get_event_start_datetime)
   ```  

**4. Process Events and Build Data Structure:**  
   - Initialize a data structure for this calendar (e.g., an empty list to hold event data objects).  
   - Loop through each event in the fetched list. For each event, determine if it’s a recurring series, an instance, or a single event:  
     - If the event has a `recurrence` field (and no `recurringEventId`), it’s a **recurring series (master event)**. This is the main entry for that series. Create a data object with its details (title, start, etc.) and include the recurrence rule string(s). You might also prepare a place to list exceptions.  
     - If the event has `recurringEventId` (meaning it’s an exception or an instance separate from the main definition) and possibly `status:"cancelled"` or different times: this is an **exception occurrence**. We should attach it to the corresponding series entry. One way is to use a dictionary keyed by recurringEventId to collect exceptions until we output everything. For example, maintain a dict `series_exceptions` where `series_exceptions[parent_id]` is a list of exception events. When you encounter an event with recurringEventId = X, append it to `series_exceptions[X]`. (Include relevant details like originalStartTime and what changed – e.g., if status is cancelled, mark it canceled on that date; if time changed, note the new time).  
     - If the event has no `recurrence` and no `recurringEventId`, it’s a **one-time event**. Just create a data object for it directly.  

   - After looping, merge exceptions into the respective recurring series objects. E.g., for each series event (by id), if it exists in `series_exceptions`, add an `"exceptions"` or `"occurrences"` field in its data entry with those details. Alternatively, you could have processed this in one pass, adding directly to the series object as you go (storing series objects in a dict by id for quick lookup).  

   - Data object fields to populate for each event:  
     - `title`: from `summary` (default to `"(No title)"` if summary is missing).  
     - `description`: from `description` (could be empty string if not present).  
     - `start` and `end`: Ideally as ISO strings. The API’s JSON already gives strings or dates. Use them directly or convert to a standard format. If `date` (all-day) is present, you might store that date and set a flag `all_day: true`. If `dateTime` is present, use that; possibly include the timezone if it’s in a separate field.  
     - `timeZone`: If you want to explicitly store each event’s time zone, you can use event.start.timeZone or the calendar’s default. This might be redundant if the `start` time string already has offset, but storing the zone ID (e.g., "America/New_York") could be useful for readability.  
     - `recurrence`: if the event has recurrence rules, include the array or the first RRULE string. (Often there’s only one RRULE; if multiple rules or RDATE/EXDATE are present, you might include them all or simplify for output.)  
     - `id`: It could be useful to store the event’s ID (Google Calendar event IDs are unique strings). This can help link exceptions to series or for debug, though not strictly needed in a read-only export. Todoist exports probably include task IDs as well.  
     - `status`: If an event is cancelled (like an exception that is cancelled), you might mark it. For a normal event, status is usually "confirmed". Unless needed, you might skip status except for exceptions.  
     - Possibly `recurringEventId` and `originalStartTime` for exceptions if you plan to use them internally. But in the final output, those could be omitted or integrated (like an exception’s originalStartTime becomes the key date in an exceptions list).  

   - Organize the event data object under the calendar’s list.  

   *Pseudocode snippet for processing:*  
   ```python
   series_data = {}
   series_exceptions = {}
   for event in events:
       if 'recurrence' in event:  # Recurring master event
           ev_id = event['id']
           entry = {
               "id": ev_id,
               "title": event.get('summary', ''),
               "description": event.get('description', ''),
               "start": get_start_datetime_or_date(event),
               "end": get_end_datetime_or_date(event),
               "timeZone": get_event_timezone(event),
               "recurrence": event.get('recurrence', []),  # list of RRULE/EXDATE strings
               # we'll add "exceptions" later if any
           }
           series_data[ev_id] = entry
           output_list.append(entry)
       elif event.get('recurringEventId'):
           parent_id = event['recurringEventId']
           # Prepare exception info
           exc_info = {
               "originalStart": event.get('originalStartTime', {}).get('dateTime') or event.get('originalStartTime', {}).get('date'),
               "newStart": get_start_datetime_or_date(event),
               "newEnd": get_end_datetime_or_date(event),
               "status": event.get('status')
           }
           series_exceptions.setdefault(parent_id, []).append(exc_info)
       else:
           # One-time event
           entry = {
               "id": event['id'],
               "title": event.get('summary', ''),
               "description": event.get('description', ''),
               "start": get_start_datetime_or_date(event),
               "end": get_end_datetime_or_date(event),
               "timeZone": get_event_timezone(event),
               "recurrence": None
           }
           output_list.append(entry)
   # Now integrate exceptions into the series entries
   for parent_id, exceptions in series_exceptions.items():
       if parent_id in series_data:
           series_data[parent_id]["exceptions"] = exceptions
       else:
           # In case the parent series isn't in the list (maybe a deleted series?), handle accordingly
           pass
   ```  

   In this pseudocode, `get_start_datetime_or_date(event)` is a helper that checks `event['start']` for a 'dateTime' key, returns that if present, otherwise returns the 'date' (all-day) value. Similarly for end. `get_event_timezone(event)` might return `event['start'].get('timeZone')` or the calendar’s tz if not set. We accumulate recurring series in `series_data` so we can update them with exceptions afterward. We place both series and one-time events into `output_list` (which is the list for that calendar in the final structure). Note that `output_list` and `series_data` are per calendar in context.

**5. Post-processing and Output Formatting:**  
   - After processing all events for all calendars, we have a data structure (e.g., a dict of lists). Ensure that the structure is correctly nested under each calendar name.  
   - Convert or output this structure to the desired format (JSON file, CSV, etc.). For hierarchical JSON, pretty-print it or save to file. If the exporter is supposed to just provide a Python object (since this is a module, maybe it returns a dict), then it might not output at all but just return the data for another part of the program to handle.  
   - Add any final touches: e.g., ensure consistent ordering (maybe sort calendars alphabetically by name for output, and events by date within each calendar).  
   - If needed, add metadata in the output, like a timestamp of when the export was generated or the user’s name, etc., though not necessary.  

   *Pseudocode:*  
   ```python
   final_data = {cal_name: cal_events_list for each calendar}
   # e.g., final_data["Work"] = [ {...event1...}, {...event2...}, ... ]
   return final_data  # or json.dump(final_data, file)
   ```  

**6. Recap Handling of Recurrence in Output:** Document in the code or README how recurring events appear in the output. For instance, if we included an `"exceptions"` list for each series, explain that it contains cancellations or changes. If we decided to list each occurrence as a separate entry instead, then explain that recurringEventId ties them to series (or we could add a field `"series_title": "..."/ series_id` to each occurrence). In our approach, we integrated exceptions into the series entry itself.  

**7. Testing and Verification:**  
   - Test the module with a sample Google account that has a variety of events: single events, recurring events with and without exceptions, all-day events, events in different time zones, etc. Verify that all these are exported correctly and that the structure aligns with expectations (and with Todoist’s analogous structure where applicable).  
   - Compare a Todoist project’s tasks vs a Google calendar’s events in the output to see if a combined view makes sense (if the planning-data-exporter intends to merge or analyze across sources). The data format should be consistent enough that one could write a consumer that handles both. For example, both could be unified under some common schema like: `{"project/calendar": [ list of items ]}`, and each item has common fields like title, description, due/start date, etc. Where one system lacks a concept (like Todoist tasks have no end time, Google events have), it might be null or absent.  

**8. Maintaining Authorization:** Provide instructions or code in the module to handle token refresh (the client library does it if the credentials have a refresh token, usually automatically on calls). Also allow re-authentication if needed (maybe a flag `--reauth` to force the OAuth flow again).  

**9. Permissions and API Limits:** Note that the Calendar API has usage limits (like queries per second). A single user exporting their data infrequently should be fine. If this tool were used in bulk or by many users, consider exponential backoff on HTTP 403 quota errors. Also handle HTTP errors (network issues, expired tokens causing 401, etc.) gracefully, perhaps by prompting re-auth or exiting with an error message instructing the user to check their credentials.  

By following these steps, you will create a Google Calendar exporter that systematically retrieves all relevant data and outputs it in a structured, hierarchical format comparable to the Todoist exporter module ([Calendars & events  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/concepts/events-calendars#:~:text=The%20recurrence%20field%20contains%20an,as%20defined%20in%20RFC%205545)) ([Calendars & events  |  Google Calendar  |  Google for Developers](https://developers.google.com/calendar/api/concepts/events-calendars#:~:text=values%20are%20interpreted%20or%20presented,instances%28%29%20methods)). This ensures the planning data from both task management and calendar scheduling can be analyzed or backed up together in a cohesive way.
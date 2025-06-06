# Harmonic Jam Jacob Green Write-up

## Implementation Approach

I built the company transfer feature with a focus on keeping things simple while ensuring a good user experience. The core functionality uses a dialog-based UI that guides users through selecting a target collection and executing the transfer. I made sure to include proper validation and error handling throughout the process.

### Progress Tracking & Timer

For tracking transfer progress, I went with a straightforward approach that estimates the time left on the transfer based on the number of files being transferred. This gives the user a good idea for what to expect in terms of wait time for large transfers while still showing that progress is being made on the transfer.

### Ignore Companies List

For the Ignore Companies List, I decied to implement a strategy that ensures when a company is in the Ignore Companies List, it can't be added to the Liked Companies List. This is so the user can accurately control what companies that don't like while still doing bulk transfers.

### Tradeoffs & Future Improvements

The biggest tradeoff I made was choosing simplicity over real-time updates. While WebSockets would give us instant progress updates, the current polling solution is much easier to debug and maintain. I also kept the transfer processing synchronous for now, though this could be a bottleneck for large transfers.

Looking ahead, I'd love to add a proper progress bar and make the transfers asynchronous. For the progress bar, we could create a new component that shows both the percentage complete and estimated time remaining. Making the transfers asynchronous would involve setting up a task queue system (maybe Celery) and building out a job management interface. This would let us handle multiple transfers simultaneously and add features like pause/resume and transfer scheduling.

Overall, I focused on getting a solid foundation in place that we can build upon. The current implementation is reliable and user-friendly, but there's plenty of room for enhancement as our needs grow.

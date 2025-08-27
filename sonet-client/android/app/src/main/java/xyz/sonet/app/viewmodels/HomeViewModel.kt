package xyz.sonet.app.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import xyz.sonet.app.models.SonetNote
import xyz.sonet.app.models.SonetUser
import xyz.sonet.app.models.MediaItem
import xyz.sonet.app.models.MediaType
import java.util.UUID

class HomeViewModel : ViewModel() {
    
    // State flows
    private val _selectedFeed = MutableStateFlow(FeedType.FOLLOWING)
    val selectedFeed: StateFlow<FeedType> = _selectedFeed.asStateFlow()
    
    private val _notes = MutableStateFlow<List<SonetNote>>(emptyList())
    val notes: StateFlow<List<SonetNote>> = _notes.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _error = MutableStateFlow<Throwable?>(null)
    val error: StateFlow<Throwable?> = _error.asStateFlow()
    
    private val _hasMoreContent = MutableStateFlow(true)
    val hasMoreContent: StateFlow<Boolean> = _hasMoreContent.asStateFlow()
    
    // Private properties
    private var currentPage = 0
    private val pageSize = 20
    private var isLoadingMore = false
    
    init {
        setupFeedObservers()
    }
    
    // Public methods
    fun loadFeed() {
        if (_isLoading.value) return
        
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            currentPage = 0
            
            try {
                val newNotes = fetchNotes(selectedFeed.value, currentPage)
                _notes.value = newNotes
                _hasMoreContent.value = newNotes.size >= pageSize
            } catch (error: Exception) {
                _error.value = error
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun refreshFeed() {
        loadFeed()
    }
    
    fun loadMoreNotes() {
        if (isLoadingMore || !_hasMoreContent.value) return
        
        viewModelScope.launch {
            isLoadingMore = true
            currentPage += 1
            
            try {
                val moreNotes = fetchNotes(selectedFeed.value, currentPage)
                _notes.value = _notes.value + moreNotes
                _hasMoreContent.value = moreNotes.size >= pageSize
            } catch (error: Exception) {
                // Don't show error for load more, just log it
                error.printStackTrace()
            } finally {
                isLoadingMore = false
            }
        }
    }
    
    fun selectFeed(feed: FeedType) {
        _selectedFeed.value = feed
        loadFeed()
    }
    
    // Private methods
    private fun setupFeedObservers() {
        // Observe feed changes and reload if needed
        // In a real implementation, this would use StateFlow operators
    }
    
    private suspend fun fetchNotes(feed: FeedType, page: Int): List<SonetNote> {
        // Simulate API call - replace with actual Sonet API
        kotlinx.coroutines.delay(1000) // 1 second
        
        // Generate mock notes for demonstration
        return generateMockNotes(feed, page)
    }
    
    private fun generateMockNotes(feed: FeedType, page: Int): List<SonetNote> {
        val startIndex = page * pageSize
        val mockNotes = mutableListOf<SonetNote>()
        
        for (i in 0 until pageSize) {
            val noteIndex = startIndex + i
            
            // Create mock author
            val author = SonetUser(
                id = "user_$noteIndex",
                username = "user$noteIndex",
                displayName = "User $noteIndex",
                avatarUrl = null,
                isVerified = noteIndex % 5 == 0, // Every 5th user is verified
                createdAt = System.currentTimeMillis() - (noteIndex * 3600000L)
            )
            
            // Create mock note content
            val noteTexts = listOf(
                "Just had an amazing day exploring the city! 🌆 #adventure #citylife",
                "Working on some exciting new projects. Can't wait to share more details! 💻",
                "Beautiful sunset this evening. Nature never fails to amaze me. 🌅",
                "Great conversation with friends today. Good company makes everything better. 👥",
                "Learning something new every day. Growth mindset is key! 📚",
                "Coffee and code - the perfect combination for productivity! ☕️",
                "Sometimes you need to take a step back to see the bigger picture. 🎯",
                "Grateful for all the amazing people in my life. 🙏",
                "New ideas are flowing today. Creativity is a beautiful thing! 💡",
                "Taking time to appreciate the little moments. Life is made of these. ✨"
            )
            
            val noteText = noteTexts[noteIndex % noteTexts.size]
            
            // Create mock media (some notes have media, some don't)
            val media: List<MediaItem>? = if (noteIndex % 3 == 0) {
                listOf(
                    MediaItem(
                        id = "media_${noteIndex}_1",
                        url = "https://picsum.photos/400/300?random=${noteIndex * 2}",
                        type = MediaType.IMAGE,
                        altText = "Random image $noteIndex"
                    )
                )
            } else {
                null
            }
            
            // Create mock note
            val note = SonetNote(
                id = "note_$noteIndex",
                text = noteText,
                author = author,
                createdAt = System.currentTimeMillis() - (noteIndex * 1800000L), // 30 min intervals
                likeCount = (0..100).random(),
                repostCount = (0..50).random(),
                replyCount = (0..25).random(),
                media = media,
                isLiked = false,
                isReposted = false
            )
            
            mockNotes.add(note)
        }
        
        return mockNotes
    }
}

// Feed Type
enum class FeedType(val displayName: String) {
    FOLLOWING("Following"),
    FOR_YOU("For You"),
    TRENDING("Trending"),
    LATEST("Latest")
}
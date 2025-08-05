#include <gtest/gtest.h>
#include <iostream>

int main(int argc, char **argv) {
    std::cout << "🧪 Running Sonet Tests..." << std::endl;
    
    ::testing::InitGoogleTest(&argc, argv);
    
    int result = RUN_ALL_TESTS();
    
    if (result == 0) {
        std::cout << "✅ All tests passed!" << std::endl;
    } else {
        std::cout << "❌ Some tests failed!" << std::endl;
    }
    
    return result;
}
